# Data.gouv.fr Tabular API MCP Server

This is a Model Context Protocol (MCP) server that provides access to the [data.gouv.fr tabular API](https://www.data.gouv.fr/dataservices/api-tabulaire-data-gouv-fr-beta/). It allows you to interact with French open data through a standardized interface.

## Features

The MCP server provides 5 main tools:

1. **`get_resource`** - Get metadata and available endpoints for a specific resource
2. **`get_resource_profile`** - Get detailed column descriptions, types, and statistics
3. **`get_resource_data`** - Get paginated data with filtering and sorting capabilities
4. **`search_resources`** - Search for datasets and resources on data.gouv.fr
5. **`get_resource_swagger`** - Get API documentation showing available filters and sorts

## Installation

### Local Development

1. Install dependencies:
```bash
yarn install
```

2. Build the project:
```bash
yarn build
```

3. Start the server:
```bash
yarn dev
```

The server will run on `http://localhost:8000/mcp` by default.

## Usage

### Finding a Resource ID

To use most tools, you need a Resource ID (rid). Here's how to find one:

1. Go to [data.gouv.fr](https://www.data.gouv.fr)
2. Search for a dataset
3. Click on a dataset
4. Go to the **Métadonnées** tab of a resource
5. Copy the Resource ID (it looks like: `1c5075ec-7ce1-49cb-ab89-94f507812daf`)

### Example Resource ID

The documentation uses this example resource ID for films data:
`1c5075ec-7ce1-49cb-ab89-94f507812daf`

### Tool Examples

#### 1. Get Resource Metadata
```json
{
  "tool": "get_resource",
  "parameters": {
    "rid": "1c5075ec-7ce1-49cb-ab89-94f507812daf"
  }
}
```

#### 2. Get Resource Profile
```json
{
  "tool": "get_resource_profile",
  "parameters": {
    "rid": "1c5075ec-7ce1-49cb-ab89-94f507812daf"
  }
}
```

#### 3. Get Resource Data with Filtering
```json
{
  "tool": "get_resource_data",
  "parameters": {
    "rid": "1c5075ec-7ce1-49cb-ab89-94f507812daf",
    "page": 1,
    "page_size": 10,
    "filters": {
      "Producteur__exact": "20th Century Fox"
    },
    "sort": "Date de sortieau cinéma__sort=desc"
  }
}
```

#### 4. Search for Resources
```json
{
  "tool": "search_resources",
  "parameters": {
    "query": "films cinéma",
    "limit": 5
  }
}
```

#### 5. Get API Documentation
```json
{
  "tool": "get_resource_swagger",
  "parameters": {
    "rid": "1c5075ec-7ce1-49cb-ab89-94f507812daf"
  }
}
```

## Filtering Options

The `get_resource_data` tool supports various filtering operators:

- `column_name__exact=value` - Exact match
- `column_name__differs=value` - Not equal
- `column_name__contains=value` - Contains (for strings)
- `column_name__in=value1,value2,value3` - In list
- `column_name__less=value` - Less than
- `column_name__greater=value` - Greater than
- `column_name__strictly_less=value` - Strictly less than
- `column_name__strictly_greater=value` - Strictly greater than

## Sorting Options

Use the `sort` parameter with:
- `column_name__sort=asc` - Ascending order
- `column_name__sort=desc` - Descending order

## Supported File Formats

The API supports these tabular formats:
- CSV (max 100 MB)
- CSV.GZ (max 100 MB)
- XLS (max 50 MB)
- XLSX (max 12.5 MB)

## Rate Limits

The API has a rate limit of 100 requests per second.

## Error Handling

The server includes comprehensive error handling for:
- Network timeouts (30 seconds)
- HTTP errors
- Invalid resource IDs
- API rate limiting

## Development

To run in development mode:
```bash
yarn dev
```

To build for production:
```bash
yarn build
```

To clean build artifacts:
```bash
yarn clean
```

## 🌐 Public Usage

Once deployed, your MCP server will be publicly available and can be used by anyone. Users can:

1. **Connect via MCP clients** using your server URL
2. **Access French open data** through the standardized MCP interface
3. **Use all 5 tools** for data exploration and analysis

### Example Public Server Usage

```json
{
  "mcpServers": {
    "datagouv-fr": {
      "command": "npx",
      "args": ["-y", "@huextrat/datagouv-tabular-api-mcp-server"],
      "env": {
        "MCP_SERVER_URL": "https://your-deployed-server.com/mcp"
      }
    }
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. The data.gouv.fr API is provided by the French government under open data policies.