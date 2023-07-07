# Academic Search Engine

## Overview

The project, Academic Search Service, aims to tackle the challenge of developing a highly usable academic search engine capable of performing complex search and query tasks on the entire Open Alex academic dataset

## Setup

List the steps needed to install your module's dependencies: 

1. Python Version 3.9.6, Elasticsearch version 8.6.2

2. Install Dependencies
```
pip install -r requirements.txt 
```

3. Data Download
```bash
aws s3 sync "s3://openalex" "openalex-snapshot" --no-sign-request
```

4. Download Elasticsearch
You can download Elasticsearch from the official website: [Elasticsearch](https://www.elastic.co/)

5. Configure Elasticsearch
Make the following changes in the `config/elasticsearch.yml` file:
```
elasticsearch.yml
```
Note: Make Sure to change the host names in each node as per the ip addr of the underlying machine.

6. Run Elasticsearch Nodes
Run the Elasticsearch nodes one by one using the following command to start the Elasticsearch service as a daemon:
```bash
bin/elasticsearch -d -p pid
```
 
4. Data Indexing
Run the Python code to index the data:
```bash
python data_ingest_works.py
```
Note: Update the source location of the data in the Python file accordingly.

# Starting the React Web Server
1. Change directory to `frontend/academic-search`
2. Install the required dependencies:
```
npm install
```
3. Start the server:
```
npm start
```
The server will start on `localhost:9200` by default.

# How to Update the data indexed?
1 - Download latest snapshot from Openalex
```
aws s3 sync "s3://openalex" "openalex-snapshot" --no-sign-request
```

2 - Run the Data Indexing script
```
python data_ingest_works.py
```
Below are configuration parameters to change to different index - Work, Author etc.
```
CHUNK_SIZE = 750 # This is the number of documents to be indexed in one request
MAX_CHUNK_BYTES = 15* 1024 * 1024 # Size in MB of payload
INDEX_NAME = "openalex_works" # Target Index
JSON_DIR_NAME = "/scratch/dhyeyhp2/works/openalex-snapshot/"     #Source dir path of openale snapshot
THREAD_COUNT = 4 # Number of threads you want to keep
```
Note: if this is a second or later iteration of a module, you may reuse the old iteration's README as a starting point (you should still update it). 

```
dhyey-pandya-academic-search-service/
    ├── add_works_template.py
    ├── data_ingest_works.py
    ├── elasticsearch.yml
    ├── frontend
    │   ├── academic-search
    │   │   ├── node_modules
    │   │   ├── public
    |   |   ├── index.html
    │   │   └── src
    │   |        ├── App.css
    │   |        ├── App.js
    │   |        ├── index.css45
    │   |        └── index.js
    ├── new_works_index_template.json
    ├── requirements.txt
``` 
* `data_ingest_works.py`: Python script to index data from the locally downloaded open-alex snapshot.
* `add_works_template.py`: Python script to add index template for Works Entity.
* `elasticsearch.yml`: Elasticsearch nodes configuration file sample.
* `frontend/App.js`: Main React Component file for entire frontend logic.

## Functional Design (Usage)
All Python and React Files in this project are simply meant to run and not packaged as a functional module.

## Demo video
https://drive.google.com/file/d/15dSYef9RoxoqH8--I2wlS-4Y9W1nQsLF/view?usp=sharing


## Algorithmic Design 
First, we setup an elastic search cluster with available Nodes with below node roles using `elasticsearch.yml`
`
3 Master eligible nodes (This should be odd to avoid split brain issue.)
2 dedicated Data Nodes - To ensure high data availabilty and efficient data indexing/searching tasks. 
`
Note - The configurations were made as per the underlying storage and computing resources and elasticsearch official documentation.
5 Machines - 16GB RAM, 4 CPU Cores and upto 1 TB disk space.

Once the raw data is obtained, a Python script is developed to transform the data into a format that is suitable for efficient full-text search operations. This includes forming full abstract text from inverted index.

Once data is transformed, we index it in batches as well parallel workers for speedy ingestion into elasticsearch cluster.

The React frontend app uses pagination and the `search_after` feature to request and display millions of results from the Elasticsearch index.

We use ElasticSearch's native functionalities to achieve all API capabilities that OpenAlex provides. For e.g search using only author, or only Institutions, or both. 

![design architecture](https://github.com/Forward-UIUC-2023S/dhyey-pandya-academic-search-service/blob/main/academic-search-engine.drawio.png))


## Issues and Future Work

In this section, please list all know issues, limitations, and possible areas for future improvement. For example:

* Limited Search options, only supports full text on abstract and keyword search on author and institution name.
* Takes up to 3 seconds to retrieve 1 Million records.
* Takes up to 48 Hours to fully index works entity - 230 Million Records.
* Can add result sorting by citation count, published date
* Can add more search filters for Source, publication etc.
* Can improve frontend to look more visually appealing. Currently its a very simplistic design.


## Change log

Use this section to list the _major_ changes made to the module if this is not the first iteration of the module. Include an entry for each semester and name of person working on the module. For example 

Spring 2023 (Dhyey Pandya)
* Project setup and Initial Commit

## References 
include links related to datasets and papers describing any of the methodologies models you used. E.g. 

* Dataset: https://docs.openalex.org/
* Elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.6/elasticsearch-intro.html

