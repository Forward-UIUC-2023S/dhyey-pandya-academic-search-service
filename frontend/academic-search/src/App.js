import React, { useState, useEffect } from 'react';
// import React, { useEffect } from 'react';

import elasticsearch from 'elasticsearch';

const client = new elasticsearch.Client({
  hosts: [
          'http://172.22.224.150:9200'
          // 'http://172.22.224.151:9200',
          // 'http://172.22.224.154:9200',
          // 'http://172.22.224.153:9200'
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.search({
          index: 'openalex_institutions',
          body: {
            size: 0,
            query: {
              prefix: {
                'international.display_name.en.keyword': 'University',
              },
            },
            aggs: {
              unique_institutions: {
                terms: {
                  field: 'international.display_name.en.keyword',
                  size: 65536,
                },
              },
            },
          },
        });
        const uniqueoptions = response.aggregations.unique_institutions.buckets;
        setOptions(uniqueoptions);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSearch = () => {
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
    } else if (searchTerm) {
      query = {
        match: {
          abstract: searchTerm
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
        match: {
          "authorships.institutions.display_name": selectedOption
        }
      };

    }
    else {
      // No search term or author name provided
      return;
    }

    client.search({
      index: 'openalex_works*',
      body: {
        query,
        size: 10,
        _source: ['display_name', 'publication_date', 'ids', 'authorships', 'abstract']
      }
    }).then(response => {
      const hits = response.hits.hits;

      // const uniqueHits = Array.from(new Set(hits.map(hit => hit._source.id)))
      //   .map(id => {
      //     return hits.find(hit => hit._source.id === id);
      //   });
      setResults(hits);
      // console.log(hits);
    });
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
  
  const AbstractButton = ({ abstract }) => {
    const [showAbstract, setShowAbstract] = useState(false);

    const toggleAbstract = () => setShowAbstract(!showAbstract);

    return (
      <div>
        <button onClick={toggleAbstract}>{showAbstract ? 'Hide Abstract' : 'Show Abstract'}</button>
        {showAbstract && <SearchResult text={abstract} searchQuery={searchTerm} />}
      </div>
    );
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginTop: '10px' }}>
        <h1>Academic Search Engine</h1>
      </div>
      <div style={{ marginTop: '50px' }}>
        <input type="text" placeholder="Search Abstract" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '500px' }}  />
        <button onClick={handleSearch}>Search</button>
      </div>
      <br/>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <span>Author :</span>
        <input type="text" placeholder="Type Author Name" value={authorFilter} onChange={handleAuthorFilterChange} style={{ width: '200px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <span>Insitution : </span>
          <Dropdown options={options} onSelect={handleSelect} />
       </div>
      <div style={{ marginTop: '50px', width: '60%' }}>
        <span>Showing top 10 results...</span>
        <ul>
          {results.map(result => (
            <li key={result._id}>
              <h2><SearchResult text={result._source.display_name} searchQuery={searchTerm}/></h2>
              <p>Authors: <SearchResult text={result._source.authorships.map(authorship => authorship.author.display_name).join(", ")} searchQuery={authorFilter}/></p>
              <p>Publication Date: {result._source.publication_date}</p>
              <a href={`https://doi.org/${result._source.ids.doi}`}>{result._source.ids.doi}</a>
              <AbstractButton abstract={result._source.abstract} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
