# Introduction

Simple DNS server in Node.js that acts as a 'proxy' of sorts. 
It passes all DNS requests to Google's DNS-over-HTTPS API (https://developers.google.com/speed/public-dns/docs/dns-over-https) and translates the JSON response to a valid DNS response.

This was made as a fun weekend project to get to know Node.js better, implementation can definitely improve. Also note that this 'DNS proxy' only currently handles: A, AAAA, CNAME and MX records.

Thanks to Peteris Nikiforovs' tutorial: https://peteris.rocks/blog/dns-proxy-server-in-node-js-with-ui/ for a good "DNS proxy" example, used his code as a basis.

# Installation

This project uses the native-dns, request and async packages. You can install these using

	npm install native-dns request async
	
Before running, make sure you set your DNS to 127.0.0.1.	

## Execute
	node app.js
	
Make sure you have sufficient rights to bind to port 53.

Simply do anything that requires a DNS lookup and you should see the output.

# License

This project is released under version 2.0 of the [Apache License][].
[Apache License]: http://www.apache.org/licenses/LICENSE-2.0