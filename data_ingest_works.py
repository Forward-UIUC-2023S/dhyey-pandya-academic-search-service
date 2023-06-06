import os
import time
import gzip
import json
import jsonlines
import elasticsearch.helpers

from datetime import datetime
from elasticsearch import Elasticsearch
from ssl import create_default_context

tbeg = datetime.now()

CHUNK_SIZE = 750
MAX_CHUNK_BYTES = 15* 1024 * 1024
INDEX_NAME = "openalex_works"
JSON_DIR_NAME = "/scratch/dhyeyhp2/works/openalex-snapshot/"
THREAD_COUNT = 2
num_records = 0


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

def get_data(data_dir):
    if os.path.isdir(data_dir):
        # loops over each part-000 files in the updated_date dir
        for filename in os.listdir(data_dir):
            if filename.endswith(".gz"): # filename < "part-007.gz"
                file_path = os.path.join(data_dir, filename)
                print(f"Indexing file {filename}")
                #if "part_027" not in filename or "part_026" not in filename:
                 #   continue

                with gzip.open(file_path, "rt") as f:
                    for line in f:
                        global num_records
                        if num_records % 500000 == 0:
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
        ],
        request_timeout = 10000
)
print(es.info())

#response = es.indices.refresh(index=INDEX_NAME)
#print(f"{response}")

# #loop over the main data dir to find the updated_date paths
for updated_date_dir in os.listdir(JSON_DIR_NAME):
     if updated_date_dir != "updated_date=2023-04-25":
         continue
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
                break
                print(f"Connection error: {error}")
                print("Retrying in 5 seconds...")
                time.sleep(15)
     else:
         elasticsearch.helpers.bulk(es, get_data(updated_date_path), index=INDEX_NAME)



elapsed_time = round((datetime.now() - tbeg).total_seconds(), 2)
print("Completed {} records in {} seconds".format(num_records, elapsed_time))

response = es.indices.refresh(index=INDEX_NAME)
print(f"{response}")
