/* Thanks to https://peteris.rocks/blog/dns-proxy-server-in-node-js-with-ui/ for a good "DNS proxy" example, used his code as a basis.

Copyright 2016 OmniscientJV

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

var dns = require('native-dns');
var async = require('async');
var request = require("request");

// Default authority for DNS look up. Used once to lookup 'dns.google.com' at 'init'.
var authority = { address: '8.8.8.8', port: 53, type: 'udp'};

// Google public DNS address, this is resolved at startup using the authority above.
var webservice = 'dns.google.com';
var httpsRequest;

var server = dns.createServer();
server.on('listening',() => console.log('server listening on', server.address()));
server.on('close', () => console.log('server closed', server.address()));
server.on('error', (err, buff, req, res) => console.error(err.stack));
server.on('socketError', (err, socket) => console.error(err));
server.serve(53);

init();

// We lookup the IP for 'dns.google.com' on start (once). We don't want to rely on the assumption that this IP stays the same, hence it's not hardcoded.
function init()
{
    var q = dns.Question({
        name: webservice,
        type: 'A'
    });

    var req = dns.Request({
        question: q,
        server: authority,
        timeout: 1000
    });

    req.on('message', function (err, answer)
    {
        // Should only have one IP, should probably handle this better.
        answer.answer.forEach((a) => webservice = 'https://' + a.address);
    });

    req.on('end', function ()
    {
        httpsRequest = request.defaults({
            baseUrl: webservice,
            strictSSL: true,
            headers: {
                'authority': 'dns.google.com',
                'host': 'dns.google.com'
            }
        });

        // Make sure we start listening after the Google Public DNS API IP has been established.
        server.on('request', handleRequest);
    });

    // That's bad, shouldn't happen, quitting.
    req.on('timeout', () => process.exit());

    req.send();
}

function handleRequest(request, response)
{
    console.log('request from', request.address.address, 'for', request.question[0].name);

    var f = [];

    // A request may contain multiple questions, so loop through all of them.
    request.question.forEach(question => {
        f.push(cb => httpsRequest('resolve?name=' + question.name, function(e, r, b)
        {
            if (!e && r.statusCode == 200)
            {
                var json = JSON.parse(b);

                // Only on success for now.
                if(json.Status == 0)
                {
                    // This will omit types that don't return 'Answers' like wpad.* for example (RR type 6, SOA records).
                    json.Answer.forEach(a => {

                        // According to the native-dns documentation, these are the default attributes that all types inherit from.
                        var record = {
                            name: a.name,
                            type: a.type,
                            ttl: a.TTL
                        };

                        // Add appropriate attributes per type.
                        // Implemented: A, AAAA, CNAME, MX.
                        switch (a.type)
                        {
                            case 1: case 28: // A & AAAA
                                record.address = a.data;
                                break;
                            case 5: // CNAME
                                record.data = a.data;
                                break;
                            case 15: // MX
                                // For example "5 hotmail.com" is a response by the API in case of an MX type.
                                record.priority = a.data.charAt(0);
                                record.exchange = a.data.substring(2);
                                break;
                        }

                        response.answer.push(dns[dnsRRTypeToString(a.type)](record));
                    });

                    cb();
                }
            }
        }));
    });

    // Asynchronous handling of the httpsRequests(s), send the response on complete.
    async.parallel(f, function() {
        response.send();
    });
}

// Simple DNS RR type to string conversion to use with native-dns.
// Look here for a comprehensive list of RR types: http://www.zytrax.com/books/dns/ch8/
function dnsRRTypeToString(type)
{
    // Default value.
    var t = 'A';

    switch(type)
    {
        case 1:
            t = 'A';
            break;
        case 28:
            t = 'AAAA';
            break;
        case 5:
            t = 'CNAME';
            break;
        case 15:
            t = 'MX';
            break;
        case 6:
            t = 'SOA';
            break;
    }

    return t;
}

