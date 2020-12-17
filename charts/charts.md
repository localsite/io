# Embeddable IO Widgets
<div class="floatright">
<img src="../img/logo/epa.png" style="width:100%; max-width:200px; margin-left:30px">
</div>
[Local Industry Evaluator](../../localsite/info/) - Contains multiple widgets - Leaflet, JQuery and React  
[Getting started with localsite](https://model.earth/localsite/start/) - clone [io repo](https://github.com/modelearth/io/) and [localsite repo](https://github.com/localsite/localsite/) into the same web root.  

<!--
## Environmentally-Enabled <span style="white-space:nowrap">Input-Output Model</span>

In RStudio
Tools > Install Packages > devtools

OR

install.packages(‘devtools’)          
library(devtools)

Rstudio has devtools intalled already, so maybe just library(devtools) to call in the package
-->

<style>
</style>


## React Widgets

[View documentation and functions](https://useeiowidgets.imfast.io/apidoc/modules/_main_.html) - 
[new loc](https://msrocka.github.io/useeio-widget-builds/apidoc/) generated using [TypeDoc](https://typedoc.org/).  

The React widgets in the io repo originate from the EPA's [USEEIO-widgets repo](https://github.com/USEPA/useeio-widgets/) - [see build](https://msrocka.github.io/useeio-widget-builds/).  
You can make widget updates in the [model.earth io repo](https://github.com/modelearth/io/) and we'll push into the EPA repo from [StateData](https://github.com/StateData/useeio-widgets/).  
The io repo includes additional code for displaying widgets. We also publish via the [io build folder](../build).  

[Inflow-Outflow Chart](inflow-outflow/#sectors=333613,335912,336111&page=1&count=10) - <a href="../build/slider.html#sectors=333613,335912,336111&page=1&count=10">Widget only</a><!-- 
[imfast.io](https://useeiowidgets.imfast.io/slider.html#sectors=322130,325520,327910,541200)-->  
[Sector List - Mosaic](../build/sector_list.html?view=mosaic&count=50)  
[Sector List - One indicator](../build/sector_list.html#view=mosaic&indicators=WATR&showvalues=true)<!--
[Sector List IO - Rubber tire manufacturing example](../build/iotables.html#sectors=326210&page=5)  
[Industry Impact Bars with Configuration](../build/impact_chart_config.html)  -->  
[More React widgets](../build/)  

## JQuery Widgets 

[Impact Bubble Chart](bubble/) - D3 and JQuery  
[Sankey Chart](sankey/) - D3 with Python prep  


<!--
If your local widgets reference the "useeio" folder, they may need to be updated occasionally as parameters change. For stability, point your local widgets at one of the [numbered backups](https://model.earth/eeio/build.2020.002) or copy the useeio folder into your project.


([old version](https://model.earth/eeio/build.2020.001), [pre-React](https://model.earth/eeio/build.2020.003) and [new version](useeio)) 
-->

## Related Map Work

[Simple embedded map sample](embed/)<!-- Remove: https://model.earth/community/impact/ -->  
[PPE Supplier Map](../../localsite/map/#show=suppliers) - Leaflet and JQuery  
[Farm Fresh Produce Map](../../localsite/map/#show=farmfresh) - Leaflet and JQuery  


<br>


# Add or Edit Widgets

## Option 1: Embed Widgets

You may embed using a [pre-built static copy](../build). 

Using the static output, you can set parameters in the URL or javascript to control the display of the widgets.  

We've copied a static version of the widgets into the "modelearth/io" repo. 
You can use the Github links for embedding.

<!--
from the [GitHub source code](https://github.com/USEPA/useeio-widgets)
-->

## Option 2: Build and Edit Widgets Locally (React)

You can build the USEEIO React widgets locally.  Start with the following repo:

[https://github.com/modelearth/io](https://github.com/modelearth/io)  
The io repo contains a fork of [useeio-widgets](https://github.com/usepa/useeio-widgets), plus a built copy and extras (navigation and configuration examples).  

Also clone the [https://github.com/localsite/localsite](https://github.com/localsite/localsite) repo and place it adjacent to the "io" repo.  
Here's info on [getting localhost setup on your local computer](../../localsite/start/).

<!--After building the widgets, you will need an API key to download the industry sector data JSON files, or you can copy the JSON files from the pre-built static copy. Post an issue to request a key.  -->

---

To build the React widgets locally you'll need a current version of
[Node.js](https://nodejs.org) installed. Make sure that the `node` and `npm`
commands are available in your systems path (you can test this via `node -v` and
`npm -v` on the command line which should give you the respective version of
these tools). 

The first step is to install the build tools and dependencies.  
Note: Use <code>cd useeio-widgets</code> instead if you are working with a direct fork.  
You can optionally right-click the io folder and choose "New Terminal at Folder" on a Mac.  

```
cd io
npm install
```


The above will add a node_modules folder.  

You can ignore errors (about 11), including "Error: `gyp` failed with exit code: 1".  

If you receive a "high severity vulnerabilities" warning, run the following as advised:  

	npm audit fix

<!--
pre-React and with React, ignored:
	`gyp` failed with exit code: 1
-->
Then build the widget libraries inside your local useeio-widgets folder:

```
npm run build
```

This should create a `build` folder with a `lib` sub-folder containing small JavaScript libraries used by the USEEIO widgets.  


### Generate Local JSON files

Once built, the `build` folder contains example HTML files that demonstrate the usage of these widgets. 
[View&nbsp;examples](https://model.earth/io/build/)
 

**io/build/api folder is already populated from the staging server**

To view widget examples locally, we've download from the Staging instance of the
[USEEIO API](https://github.com/USEPA/USEEIO_API) via the following:

```
npm run download -- --endpoint https://smmtool.app.cloud.gov/api
```
The command above mirrors the static data from the Staging API into the `build/api` folder in two folders: USEEIO and GAUSEEIO (and a third for upcoming v2 data).  The GAUSEEIO folder contains data for Georgia.  

Sometimes we have to run the command above a second time to populate build/api/GAUSEEIO/demands table. (Aug 2020)  

Note: Every 90 days the staging server requires a reboot, email the [contact person](https://github.com/USEPA/USEEIO_API/wiki/People#Contact) to restart.  
If the '/api' address returns 404, you can use the staging 
<a href="https://smmtool.app.cloud.gov/" target="_blank">endpoint overview</a> to see if it is online.  

You may optionall [request the key](https://github.com/USEPA/USEEIO_API/wiki/Use-the-API) to the production API to run the following:  

```
npm run download -- --endpoint https://api.edap-cluster.com/useeio/api --apikey [Add API key here]
```
<div class="local" style="display:none; margin-bottom:20px">
Production API (Requires API key, what's the URL format?) 
<a href="https://api.edap-cluster.com/?x-api-key=" target="_blank">endpoint overview</a>


</div>

Learn more about [using the USEEIO API](https://github.com/USEPA/USEEIO_API/wiki/Use-the-API)

After generating build/api folder from the production API:  
<!--
1. Duplicate USEEIOv1.2 to USEEIO for existing script in non-React widgets.  
2. Duplicate USEEIOv1.2 to GAUSEEIO since GA data currently only resides on the staging server.  
-->
Duplicate GAUSEEIO to USEEIOv1.2 for Inflow-Outflow Chart  

You now have two options for viewing the widgets locally.

<b>Option 1:</b> Start a server using the command <code>npm run server</code>. 
Then open the default port (8080) at http://localhost:8080 in your browser to see the widgets.  Your command window will become inoperable since it is running a server.  Open a new command window (by clicking plus) to issue further commands.  

<b>Option 2:</b> View at the following URL if the "io" folder resides in your webroot.  

[http://localhost:8887/io/build](http://localhost:8887/io/build)  

If you are working in a direct fork of the "useeio-widgets" repo, view here:  

[http://localhost:8887/useeio-widgets/build](http://localhost:8887/useeio-widgets/build)  


## How to Modify Widgets within VS Code

Open a command prompt in the "io" repo folder and type:

	code .

Note: You may need to [Configure your VS Code Editor](https://code.visualstudio.com/docs/setup/setup-overview) so running `code .` launches the editor.  Avoid running in io's parent folder, or your VS Code editor will not allow you to run subsequent commands inside its terminal.  

If you have not yet run `npm install` and the API to JSON download, start with the steps above.  

Next, open a command shell window within VS Code (Ctrl + \` backtick) or (View > Terminal) and type the following: 

	npm run build

Use the up-arrow to run the line above again after making a change.  

View the output of your build at [http://localhost:8887/io/build](http://localhost:8887/io/build) 

Learn more in the VS Code [Node.js Tutorial](https://code.visualstudio.com/docs/nodejs/nodejs-tutorial). 

### You may also contribute to the USEEIO-widget repo directly

To make updates in the NodeJS source code, fork the [USEEIO-widgets](https://github.com/USEPA/useeio-widgets/) repo and save in your local webroot (where you've [pointed](../../localsite/start/) http://localhost:8887/)  

Edit the files that reside in useeio-widgets/src. (Avoid editing files in useeio-widgets/build, these will be overwritten when you run the build.) 


Testing this:  
[LiveReload](https://www.logicbig.com/tutorials/misc/typescript/project-auto-refresh-with-live-reload.html) will refresh your browser as you edit.  Install using the [Extension Marketplace](https://code.visualstudio.com/docs/editor/extension-gallery)  

Get under the hood! Mess with our [Python Samples](../../community/resources/useeio) and 
[add a new technology to the matrix using RStudio](../naics).

<!--
From the following:
https://stackoverflow.com/questions/18428374/commands-not-found-on-zsh

1. Use a good text editor like VS Code and open your .zshrc file (should be in your home directory. 

Command+Shift+H
Command+Shift+Dot

if you don't see it, be sure to right-click in the file folder when opening and choose option to 'show hidden files').

2. find where it states: export PATH=a-bunch-of-paths-separated-by-colons:

3. insert this at the end of the line, before the end-quote: :$HOME/.local/bin

-->

## FAQs

### Why are some values in the demand vector $0 (blank)?

In some cases there is no final demand for the respective commodity and the production of that commodity is only driven by intermediate industry transactions (note that there are different demand vectors in the model and that the selected demand can be controlled via the configuration attributes). 


### How is code formatting enforced?

The `.editorconfig` file contains the formatting settings. Modern editors have plugins for checking EditorConfig settings. This maintains consistench so we can see in the diffs what changed. There is also a ESLint configuration in the project for other settings like semicolon rules etc.


## Sustainable Communities Web Challenge

[Get involved with our 2021 Sustainable Communities Web Challenge](https://model.earth/community/challenge) - $10,000&nbsp;in&nbsp;awards!  
