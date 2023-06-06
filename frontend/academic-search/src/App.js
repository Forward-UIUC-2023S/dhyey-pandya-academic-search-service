import React, { useState, useEffect } from 'react';
// import React, { useEffect } from 'react';

import elasticsearch from 'elasticsearch';

const client = new elasticsearch.Client({
  hosts: [
    'http://172.22.224.151:9200',
    'http://172.22.224.152:9200',
    'http://172.22.224.154:9200',
    'http://172.22.224.150:9200'
  ]
});


const SearchResult = ({ text, searchQuery }) => {
  const regex = new RegExp(`(${searchQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <div>
      {parts.map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={index}>{part}</mark>
        ) : (
          part
        )
      )}
    </div>
  );
};

const Dropdown = ({ options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (value) => {
    onSelect(value);
    setIsOpen(false);
    setSearchValue(value);
  };

  const handleInputChange = (event) => {
    setSearchValue(event.target.value);
  };

  const filteredOptions = options.filter((option) =>
    option.key.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="dropdown-container">
      <input
        type="text"
        placeholder="Type Institution Name"
        value={searchValue}
        onChange={handleInputChange}
        onClick={handleToggle}
      />
      {isOpen && (
        <ul className="dropdown-menu">
          {filteredOptions.map((option, index) => (
            <li key={index} onClick={() => handleSelect(option.key)}>
              {option.key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};



function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [authorFilter, setAuthorFilter] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalHits, setTotalhits] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const resultsPerPage = 10; // Number of results to display per page

  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = results.slice(indexOfFirstResult, indexOfLastResult);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.search({
          index: 'openalex_institutions',
          body: {
            size: 0,
            query: {
              term: {
                'type.keyword': 'education',
              },
            },
            aggs: {
              unique_institutions: {
                terms: {
                  field: 'display_name.keyword',
                  size: 65536,
                },
              },
            },
          },
        });
        const uniqueoptions = response.aggregations.unique_institutions.buckets;
        // console.log(uniqueoptions);
        setOptions(uniqueoptions);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const getQuery = () => {
    let query = {};

    if (searchTerm && authorFilter && selectedOption) {
      query = {
        bool: {
          must: [
            { match: { abstract: searchTerm } },
            { match: { "authorships.author.display_name": authorFilter } },
            { match: { "authorships.institutions.display_name": selectedOption } }
          ]
        }
      };
    }
    else if (authorFilter && selectedOption) {
      query = {
        bool: {
          must: [
            { match: { "authorships.author.display_name": authorFilter } },
            { match: { "authorships.institutions.display_name": selectedOption } }
          ]
        }
      };
    }
    else if (authorFilter && searchTerm) {
      query = {
        bool: {
          must: [
            { match: { abstract: searchTerm } },
            { match: { "authorships.author.display_name": authorFilter } }
          ]
        }
      };
    }
    else if (searchTerm) {
      query = {
        match: {
          abstract: {
            query: searchTerm
          }
        }
      };
    } else if (authorFilter) {
      query = {
        match: {
          "authorships.author.display_name": authorFilter
        }
      };
    } else if (selectedOption) {
      query = {
        term: {
          "authorships.institutions.display_name": selectedOption
        }
      };

    }

    else {
      // No search term or author name provided
      return;
    }

    // console.log(query);
    return query;
  }

  const handleSearch = () => {
    let query = getQuery();
    const startTime = new Date().getTime();

    client.search({
      index: 'openalex_works',
      body: {
        query,
        size: resultsPerPage,
        track_total_hits: true,
        _source: ['display_name', 'publication_date', 'ids', 'authorships', 'highlight'],
        highlight: {
          tags_schema: 'styled',
          fields: {
            abstract: {
              pre_tags: ['<mark>'],
              post_tags: ['</mark>']
            }
          }
        },
        sort: [
          // { publication_date: 'desc'},
          { _score: { order: 'desc' } },
          { id: { order: 'asc' } }
        ]
      }
    }).then(response => {
      const hits = response.hits.hits;
      const endTime = new Date().getTime();

      const seconds = (endTime - startTime) / 1000; // Convert to seconds
      const totalPages = Math.ceil(response.hits.total.value / resultsPerPage);
      // console.log(response.hits.total.value);
      // console.log(resultsPerPage);
      setTimeTaken(seconds);
      setTotalPages(totalPages);
      setTotalhits(response.hits.total.value);
      setResults(hits);
      // console.log(hits);
    });
  };

  const fetchNextPage = async () => {
    try {
      // setIsLoading(true);
      let query = getQuery();
      const lastResult = results[results.length - 1];
      const lastResultSort = lastResult.sort; // Assuming your results have a sort field
      const startTime = new Date().getTime();

      // console.log(lastResultSort);
      const response = await client.search({
        index: 'openalex_works',
        body: {
          query,
          size: resultsPerPage,
          track_total_hits: false,
          _source: ['display_name', 'publication_date', 'ids', 'authorships', 'highlight'],
          highlight: {
            tags_schema: 'styled',
            fields: {
              abstract: {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>']
              }
            }
          },
          search_after: lastResultSort,
          sort: [
            { _score: { order: 'desc' } },
            { id: { order: 'asc' } }
          ]
        }
      });

      const hits = response.hits.hits;
      const endTime = new Date().getTime();

      const seconds = (endTime - startTime) / 1000; // Convert to seconds
      setTimeTaken(seconds);
      setResults(prevResults => [...prevResults, ...hits]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchPreviousPage = async () => {
    try {
      const firstResult = results[0];
      const firstResultSort = firstResult.sort; // Assuming your results have a sort field

      const response = await client.search({
        index: 'openalex_works',
        body: {
          query: getQuery(),
          size: resultsPerPage,
          track_total_hits: false,
          _source: ['display_name', 'publication_date', 'ids', 'authorships', 'highlight', 'abstract'],
          highlight: {
            tags_schema: 'styled',
            fields: {
              abstract: {
                pre_tags: ['<mark>'],
                post_tags: ['</mark>']
              }
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { id: { order: 'asc' } }
          ],
          search_before: firstResultSort
        }
      });

      const hits = response.hits.hits.reverse();

      setResults(prevResults => [...hits, ...prevResults]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
    fetchNextPage();
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    fetchPreviousPage();
  };

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAuthorFilterChange = (e) => {
    setAuthorFilter(e.target.value);
  }

  function handleInputChange(event) {
    setSelectedOption(event.target.value);
  }

  const handleSelect = (value) => {
    setSelectedOption(value);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginTop: '10px' }}>
        <h1>Academic Search Engine</h1>
      </div>
      <div style={{ marginTop: '50px' }}>
        <input type="text" placeholder="Search Abstract" value={searchTerm} onKeyPress={handleKeyPress} onChange={e => setSearchTerm(e.target.value)} style={{ width: '500px' }} />
        <button onClick={handleSearch}>Search</button>
      </div>
      <br />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <span>Author :</span>
        <input type="text" placeholder="Type Author Name" value={authorFilter} onChange={handleAuthorFilterChange} style={{ width: '200px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <span>Insitution : </span>
        <Dropdown options={options} onSelect={handleSelect} />
      </div>
      <div style={{ marginTop: '50px', width: '60%' }}>
        <span>Showing results {indexOfFirstResult + 1} - {indexOfLastResult} of {totalHits}</span>
        <div>Time taken: {timeTaken} seconds</div>
        <ul>
          {currentResults.map(result => (
            <li key={result._id}>
              <h2><SearchResult text={result._source.display_name} searchQuery={searchTerm} /></h2>
              <p>Authors: <SearchResult text={result._source.authorships.map(authorship => authorship.author.display_name).join(", ")} searchQuery={authorFilter} /></p>
              <p>Publication Date: {result._source.publication_date}</p>
              <a href={`https://doi.org/${result._source.ids.doi}`}>{result._source.ids.doi}</a>
              <h4>Abstract Snippet</h4>
              {result.highlight && result.highlight.abstract && result.highlight.abstract.length > 0 && (
                <span dangerouslySetInnerHTML={{ __html: result.highlight.abstract.slice(0, 2).join(' ........ ') }}></span>
              )}
            </li>
          ))}
        </ul>
        <div>
          <button onClick={handlePreviousPage} disabled={currentPage === 1}>
            Previous Page
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages}>
            Next Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;