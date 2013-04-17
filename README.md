#Salamati

Salamati is a web client based on OpenLayers that provides capabilities for editing features and interacting with GeoGit repositories

##Features
 * Add and manage map layers using OGC services
 * Edit point, line, and polygon features (geometry and attributes)
 * Interact with GeoGit respositories using the GeoGit web API
 * Temporal playback for temporal layers
 * Intergration with GeoNode

##Build Instructions
**Example**

```ant -f suitesdk/build.xml -Dapp.path=../webapp/ -Dsdk.build=../build -Dapp.name=salamati package```

 * suitesdk/build.xml = path/to/OpenGeoClientSDK/ant/script
 * app.path = path/to/webapp/source/code
 * sdk.build = path/to/output/build/directory
 * app.name = name of packaged war file
 * package = ant target to build and package war file

**N.B.** The ant script does not contain a clean step so you may have to add one for local builds.

See [here](http://suite.opengeo.org/opengeo-docs/usermanual/tutorials/clientsdk.html) for more information about the OpenGeo ClientSDK.

##Deploying the war
Here are some ways to deploy the generated war file (there are probably others):
 * Copy the war file to your J2EE container's webapps folder, i.e. .../tomcat7/webapps
 * Use the Tomcat Manager web app, or equivalent for other J2EE container, to deploy an uploaded war
 * Use the *deploy* target in the suitesdk/build.xml ant script to deploy using [Cargo](http://cargo.codehaus.org/)
 * Set up a custom [Cargo](http://cargo.codehaus.org/) deployment
 
##Deploying through GeoServer
 **Example**
 
 * Run GeoServer.
 * In Terminal, navigate to the Salamati folder and run the following:
 
 ```ant -f suitesdk/build.xml -Dapp.path=../webapp/ -Dsdk.build=../build -Dapp.name=salamati -Dapp.proxy.geoserver=http://localhost:8080/geoserver debug```
 
 * This should deploy to port 9080 by default (the console will output the port number)
 * This will also allow you to update the files without having to remake the war file. Just save and refresh the webpage.

##License

Salamati is licensed under the [BSD 3-clause license] (http://opensource.org/licenses/BSD-3-Clause)

Copyright (c) 2013, LMN Solutions LLC.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the copyright holder, nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
