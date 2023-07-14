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


## Elasticsearch query API's and Use Cases

### Publications

**Get all Unique publishers**

This can be used as a dropdown to filter results based on a specific publication.

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.151:9200/openalex_publishers/_search' \
--header 'Content-Type: application/json' \
--data '{
  "size": 0,
  "aggs": {
    "unique_publishers": {
      "terms": {
        "field": "display_name.keyword",
        "size": 10000
      }
    }
  }
}'
```

**Sample Result:**

```json
  
"buckets": [
                {
                    "key": "Central American University",
                    "doc_count": 2
                },
                {
                    "key": "Cyprus International University",
                    "doc_count": 2
                },

```

**Get publishers that are located in the United States (Country Code: US)**

This can be used for advanced filters to further filter unique publications from the previous result.

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.151:9200/openalex_publishers/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "country_codes.keyword": "US"
          }
        }
      ]
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/P4310315596",
                    "display_name": "Code4Lib",
                    "country_codes": [
                        "US"
                    ],
                    "works_count": 404,
                    "cited_by_count": 631,
```

---

### Works

**Searching by external unique ID: Find all the Works with a unique external ID such as a DOI**

This can be used to fetch unique and specific works from the dataset.

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search?=null' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "term": {
      "doi": "https://doi.org/10.1016/j.optcom.2017.02.046"
    }
  }
}'
```

**Sample Output:**

```json
       "_source": {
           "id": "https://openalex.org/W2591299839",
           "doi": "https://doi.org/10.1016/j.optcom.2017.02.046",
           "display_name": "Improving the signal-to-noise ratio of complementary compressive imaging with a threshold",
           "title": "Improving the signal-to-noise ratio of complementary compressive imaging with a threshold",
           "publication_year": 2017,
           "publication_date": "2017-06-15",
           "ids": {
               "openalex": "https://openalex.org/W2591299839",
               "doi": "https://doi.org/10.1016/j.optcom.2017.02.046",
               "mag": 2591299839
           }
```

**Searching by title: Users can search for works by entering keywords or phrases from the title of the document.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search?=null' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "match": {
      "title": {
        "query": "Database Systems",
        "operator": "and"
      }
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
            "id": "https://openalex.org/W2624534378",
            "doi": null,
            "display_name": "Database Systems",
            "title": "Database Systems",
            "publication_year": 2013,
            "publication_date": "2013-07-23",
            "ids": {
                "openalex": "https://openalex.org/W2624534378",
                "mag": 2624534378
            }
```

**Searching by author: Users can search for works by specifying the name of an author or a combination of authors.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search?=null' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "match": {
      "authorships.author.display_name": "Ke-Vin Chang"
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W3158041877",
                    "doi": "https://doi.org/10.1111/papr.13024",
                    "display_name": "Ultrasound imaging of the posterior cruciate ligament and its mimic, the posterior meniscofemoral ligament",
                    "title": "Ultrasound imaging of the posterior cruciate ligament and its mimic, the posterior meniscofemoral ligament",
                    "publication_year": 2022,
                    "publication_date": "2022-01-01",
                    "authorships": [
                        {
                            "author_position": "first",
                            "author": {
                                "id": "https://openalex.org/A4356637748",
                                "display_name": "Ke-Vin Chang",
                                "orcid": null
                            },
                            "institutions": [
                                {
                                    "id": "https://openalex.org/I4210131804",
                                    "display_name": "National Taiwan University Hospital",
                                    "ror": "https://ror.org/03nteze27",
                                    "country_code": "TW",
                                    "type": "healthcare"
                                }
                            ],
```

**Searching by Author and Institution both: Users can search for works published by a specific author from a specific institution**

Elasticsearch Query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "authorships.author.display_name": "Ke-Vin Chang"
          }
        },
        {
          "match": {
            "authorships.raw_affiliation_string": "University of Illinois Urbana-Champaign"
          }
        }
      ]
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W2952447489",
                    "doi": "https://doi.org/10.1109/icde.2019.00217",
                    "display_name": "Faster, Higher, Stronger: Redesigning Spreadsheets for Scale",
                    "title": "Faster, Higher, Stronger: Redesigning Spreadsheets for Scale",
                    "publication_year": 2019,
                    "publication_date": "2019-04-08",
                    "authorships": [
                        {
                            "author_position": "middle",
                            "author": {
                                "id": "https://openalex.org/A4353800676",
                                "display_name": "Ke-Vin Chang",
                                "orcid": null
                            },
                            "institutions": [
                                {
                                    "id": "https://openalex.org/I157725225",
                                    "display_name": "University of Illinois Urbana-Champaign",
                                    "ror": "https://ror.org/047426m28",
                                    "country_code": "US",
                                    "type": "education"
                                }
                            ],
```

**Searching by publication venue: Users can search for works published in a specific journal or conference by specifying the name or ISSN of the publication venue.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "match": {
      "host_venue.display_name": "Japanese annals of thoracic surgery"
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W187621153",
                    "doi": null,
                    "title": "[A sump drainage system using high negative pressure after cardiac surgery].",
                    "publication_year": 1983,
                    "publication_date": "1983-01-01",
                    },
                    "host_venue": {
                        "id": "https://openalex.org/S2756072081",
                        "issn_l": null,
                        "issn": null,
                        "display_name": "Japanese annals of thoracic surgery",
                        "publisher": null,
                        "host_organization": null,
```

**Searching by publication date range: Users can search for works published in a particular year or within a specific date range. (For example, works published between Jan 1, 2023, to March 31, 2023)**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "range": {
      "publication_date": {
        "gte": "2023-01-01",
        "lte": "2023-03-31"
      }
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W4361304223",
                    "doi": "https://doi.org/10.3760/cma.j.issn.0253-2727.2023.01.013",
                    "display_name": "[Acute lymphoblastic leukemia with EBF1-PDGFRB fusion gene: two cases report and literature review].",
                    "publication_year": 2023,
                    "publication_date": "2023-01-14",
                    "ids": {
                        "openalex": "https://openalex.org/W4361304223",
                        "doi": "https://doi.org/10.3760/cma.j.issn.0253-2727.2023.01.013",
                        "pmid": "https://pubmed.ncbi.nlm.nih.gov/36987727"
                    },
```

**Searching by concept: Users can search for works related to specific concepts or topics by using relevant keywords or identifiers associated with those concepts.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "terms": {
      "concepts.display_name": ["Data Science", "Database", "Information System"]
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W2911833128",
                    "doi": null,
                    "display_name": "Ibm websphere v4.0 advanced edition: scalability and availability",
                    "title": "Ibm websphere v4.0 advanced edition: scalability and availability",
                    "publication_year": 2002,
                    "publication_date": "2002-05-16",
                    "concepts": [
                        {
                            "id": "https://openalex.org/C41008148",
                            "wikidata": "https://www.wikidata.org/wiki/Q21198",
                            "display_name": "Computer science",
                            "level": 0,
                            "score": 0.68125623
                        },
                        {
                            "id": "https://openalex.org/C77088390",
                            "wikidata": "https://www.wikidata.org/wiki/Q8513",
                            "display_name": "Database",
                            "level": 1,
                            "score": 0.32477164
                        },
                        
```

**Searching by citation count: Users can search for works based on their citation count, allowing them to find highly cited or influential papers.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "range": {
      "cited_by_count": {
        "gte": 10
      }
    }
  }
}'
```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W37418007",
                    "doi": "https://doi.org/10.1093/jaoac/60.3.594",
                    "title": "Collaborative Study of Modified AOAC Method of Analysis for Nitrite in Meat and Meat Products",
                    "publication_year": 1977,
                    "publication_date": "1977-05-01",
                    "corresponding_institution_ids": [],
                                        "cited_by_count": 39,
                                        "summary_stats": {
                                            "cited_by_count": 39,
                                            "2yr_cited_by_count": 2
                                        },
```

**Searching by related works: Users can explore related works of a specific paper by following the links to other documents that are related or cited by the current work.**

Elasticsearch query API:

```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "match": {
      "title": "[A sump drainage system using high negative pressure after cardiac surgery]."
    }
  },
  "_source": [
      "title",
      "related_works"
  ]
}'
```

**Sample Output:**

```json
"_index": "openalex_works",
                "_id": "https://openalex.org/W187621153",
                "_score": 1.0,
                "_source": {
                    "title": "[A sump drainage system using high negative pressure after cardiac surgery].",
                    "related_works": [
                        "https://openalex.org/W1989160339",
                        "https://openalex.org/W2002120878",
                        "https://openalex.org/W2003938723",
                        "https://openalex.org/W2019517015",
                        "https://openalex.org/W2029198700",
                        "https://openalex.org/W2047967234",
                        "https://openalex.org/W2118496982",
                    ]
                }
```

**Searching by full-text availability: Users can search on abstracts for works with open access, helping them find freely accessible research articles, and find relevant abstracts.**

Elasticsearch query API:
```shell
curl --location --request GET 'http://172.22.224.152:9200/openalex_works/_search' \
--header 'Content-Type: application/json' \
--data '{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "open_access.is_oa": true
          }
        },
        {
          "match": {
            "abstract": "data and information systems"
          }
        }
      ]
    }
  }
}
'

```

**Sample Output:**

```json
"_source": {
                    "id": "https://openalex.org/W4321226557",
                    "doi": "https://doi.org/10.1002/asi.24745",
                    "display_name": "Critical data modeling and the basic representation model",
                    "title": "Critical data modeling and the basic representation model",
                    "publication_year": 2023,
                    "publication_date": "2023-02-17",
                    "language": "en",
                    "created_date": "2023-02-18",
                    "abstract": "The increasing role and impact of information systems in modern life call for new types of information  studies **information systems**. Critical data modeling adds   an essential complement to existing approaches to critical information studies by grounding the analysis of an information system in both the technical realities of computational systems and the social realities of our communities."

```
 
## Issues and Future Work

In this section, please list all know issues, limitations, and possible areas for future improvement. For example:

* Limited Search options, only supports full text on abstract and keyword search on author and institution name.
* Takes up to 3 seconds to retrieve 1 Million records.
* Takes up to 48 Hours to fully index works entity - 230 Million Records.
* Can add result sorting by citation count, published date
* Can add more search filters for Source, publication etc.
* Can improve frontend to look more visually appealing. Currently its a very simplistic design.
* Matches that return other authors' institution results can be fixed, so that only works of the author associated with correct institution are returned.


## Change log

Use this section to list the _major_ changes made to the module if this is not the first iteration of the module. Include an entry for each semester and name of person working on the module. For example 

Spring 2023 (Dhyey Pandya)
* Project setup and Initial Commit

## References 
include links related to datasets and papers describing any of the methodologies models you used. E.g. 

* Dataset: https://docs.openalex.org/
* Elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.6/elasticsearch-intro.html

