# Emotion-enabled YouTube Demo

This demo uses Affectiva's JavaScript SDK to plot your emotion data. The code is written entirely in JavaScript, HTML, and CSS. [d3](https://d3js.org/) was used to render the emotions graph.

For more information about Affectiva's JavaScript SDK, visit http://developer.affectiva.com/. 

## Running the Demo Locally:

### Requirements:

* Python 2.x or higher
* Supported web browser (Google Chrome, Firefox, or Opera)

### Getting Started:

* Install [Python](https://www.python.org/downloads/release/python-2710/)

To test if Python is installed, run the following command on either Command Prompt or Terminal:

```
$ python
```

* Clone the repository on your local machine

* Open Command Prompt/Terminal and navigate to the folder where the source code was cloned
* Run a server with the following command:
	
#### Python 2.x

```
$ python -m SimpleHTTPServer 8000 
```

#### Python 3.x

```
$ python -m http.server 8000 
```

Once the server is up, open a web browser and navigate to [http://localhost:8000/](http://localhost:8000/). The demo should start loading.
