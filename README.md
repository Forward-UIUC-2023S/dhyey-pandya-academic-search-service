# dhyey-pandya-academic-search-service

## Data Download
```bash
aws s3 sync "s3://openalex" "openalex-snapshot" --no-sign-request
```

## Download Elasticsearch
You can download Elasticsearch from the official website: [Elasticsearch](https://www.elastic.co/)

## Configure Elasticsearch
Make the following changes in the `config/elasticsearch.yml` file:
```
elasticsearch.yml
```
Note: Make Sure to change the host names in each node as per the ip addr of the underlying machine.

## Run Elasticsearch Nodes
Run the Elasticsearch nodes one by one using the following command to start the Elasticsearch service as a daemon:
```bash
bin/elasticsearch -d -p pid
```

## Data Indexing
Run the Python code to index the data:
```bash
python data_ingest_works.py
```
Note: Update the source location of the data in the Python file accordingly.

## Starting the React Web Server
1. Change directory to `frontend/academic-search`
2. Install the required dependencies:
```bash
npm install
```
3. Start the server:
```bash
npm start
```
The server will start on `localhost:9200` by default.

## Useful Elasticsearch REST API Calls
1. Check Cluster Health:
```bash
curl --location 'http://172.22.224.151:9200/_cluster/health' \
--header 'Authorization: Basic ZWxhc3RpYzpFN0FhSGZWUExaOTNiNzVaU2k9eQ==' \
--data ''
```

Feel free to modify and use this markdown file for your GitHub Readme.
```
Change the Authorization key to the one provided when you first start the server. The key is different for each user.

2. Check Cluster Disk Usage

```
curl --location 'http://172.22.224.153:9200/_cat/allocation?v=null'
```

3. See all the indices and its metadata in the cluster
```
curl --location 'http://172.22.224.152:9200/_cat/indices?v=null'
```





