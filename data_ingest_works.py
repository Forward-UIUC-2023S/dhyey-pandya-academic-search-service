import os
import time
import gzip
import json
import jsonlines
import elasticsearch.helpers
from memory_profiler import profile

from datetime import datetime
from elasticsearch import Elasticsearch
from ssl import create_default_context

tbeg = datetime.now()

CHUNK_SIZE = 300
MAX_CHUNK_BYTES = 10* 1024 * 1024
INDEX_NAME = "openalex_works"
JSON_DIR_NAME = "/scratch/dhyeyhp2/works/openalex-snapshot/"
THREAD_COUNT = 4
num_records = 0

completed = []
with open("completed_files.txt", "r") as f:
    completed = [fl.strip() for fl in f.readlines()]

def get_abstract(inverted_index):
    # If the inverted index is empty, return None
    if not inverted_index:
        return None

    # Determine the length of the original text
    length = max(max(v) for v in inverted_index.values())

    # Create a list of the words in the original text, with empty strings where there are no words
    words = [""] * (length + 1)
    for k, v in inverted_index.items():
        for pos in v:
            words[pos] = k

    # Join the words together to form the original text
    text = " ".join(words).strip()
    return text


# generator or reading in the JSON data
@profile
def get_data(data_dir):
    if os.path.isdir(data_dir):
        # loops over each part-000 files in the updated_date dir
        for filename in os.listdir(data_dir):
            if filename.endswith(".gz"):
                file_path = os.path.join(data_dir, filename)

                with gzip.GzipFile(file_path, "r") as f:
                    chunk_size = 1024  # Adjust the chunk size as needed
                    while True:
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        process_chunk(chunk)
                        
                with gzip.open(file_path, "rt") as f:
                    for line in f:
                        global num_records
                        if num_records % 1000000 == 0:
                            print(f"{num_records} processed")
                        num_records += 1
                        doc = json.loads(line)
                        doc["abstract"] = get_abstract(doc.get("abstract_inverted_index"))
                        doc["abstract_inverted_index"] = None
                        doc["_id"] = doc["id"]
                        yield doc

parallel = True


es = Elasticsearch(
        [
        "http://172.22.224.151:9200",
        "http://172.22.224.152:9200",
        "http://172.22.224.153:9200"
        ],
        request_timeout = 10000
)
print(es.info())

#response = es.indices.refresh(index=INDEX_NAME)
#print(f"{response}")

# #loop over the main data dir to find the updated_date paths
for updated_date_dir in os.listdir(JSON_DIR_NAME):
     
    # if "2023-" not in updated_date_dir or '2023-02-18' in updated_date_dir:
     #    continue
     #flag = False
     #for c in completed:
         #if updated_date_dir in c:
            #flag = True
            # continue
     #if flag:
        # print(f"skipping {updated_date_dir}")
        # continue

     updated_date_path = os.path.join(JSON_DIR_NAME, updated_date_dir)
     if parallel:
         print(f"Indexing {updated_date_path}")
         while True:
            try:
                for success, errinfo in elasticsearch.helpers.parallel_bulk(
                     es,
                    get_data(updated_date_path),
                    thread_count=THREAD_COUNT,
                    chunk_size=CHUNK_SIZE,
                    max_chunk_bytes=MAX_CHUNK_BYTES,
                    index=INDEX_NAME,
                ):
                     if not success:
                        print("Failed")

                break
            except Exception as error:
                print(f"Connection error: {error}")
                print("Retrying in 5 seconds...")
                time.sleep(15)
     else:
         elasticsearch.helpers.bulk(es, get_data(updated_date_path), index=INDEX_NAME)



elapsed_time = round((datetime.now() - tbeg).total_seconds(), 2)
print("Completed {} records in {} seconds".format(num_records, elapsed_time))

response = es.indices.refresh(index=INDEX_NAME)
print(f"{response}")
