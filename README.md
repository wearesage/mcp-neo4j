# @sage/mcp-neo4j

Neo4j graph interface, implemented using the Model Context Protocol (MCP).

## Overview

This package provides a Model Context Protocol (MCP) server that interfaces with a Neo4j graph database. It allows AI assistants to query and retrieve information from Neo4j databases using standardized tools.

The server exposes two main tools:
- `get_graph_schema`: Retrieves the Neo4j database schema with optional domain filtering
- `run_cypher_query`: Executes Cypher queries against the Neo4j database

## Installation

```bash
npm install @sage/mcp-neo4j
```

## Configuration

The server requires the following environment variables:

- `NEO4J_URI`: The URI of your Neo4j database (e.g., `neo4j://localhost:7687`)
- `NEO4J_USER`: The username for Neo4j authentication
- `NEO4J_PASSWORD`: The password for Neo4j authentication

You can set these in a `.env` file in your project root:

```
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## Usage

### Starting the Server

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Start the server
const server = new McpServer({
  name: "sage",
  version: "1.0.0"
});

// Connect using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Using the Tools

#### Get Graph Schema

Retrieves the Neo4j database schema, optionally filtered by domain.

```javascript
// Get full schema
const fullSchema = await server.tool("get_graph_schema", {});

// Get schema for a specific domain
const codeSchema = await server.tool("get_graph_schema", { domain: "code" });

// Get schema for multiple domains
const multiDomainSchema = await server.tool("get_graph_schema", { domain: ["code", "mind"] });
```

#### Run Cypher Query

Executes a Cypher query against the Neo4j database.

```javascript
// Simple query
const result = await server.tool("run_cypher_query", {
  query: "MATCH (n:Person) RETURN n LIMIT 10"
});

// Query with parameters
const paramResult = await server.tool("run_cypher_query", {
  query: "MATCH (n:Person) WHERE n.name = $name RETURN n",
  params: { name: "John Doe" }
});
```

## Supported Domains

The server supports filtering schema by the following domains:

### Code Domain

Node types include: Codebase, Package, Directory, File, Module, Class, Interface, etc.

Relationship types include: IMPORTS, EXTENDS, IMPLEMENTS, CALLS, CONTAINS, etc.

### Mind Domain

Node types include: Hypothesis, Reflection, Insight, Question, Decision, Pattern, etc.

Relationship types include: SUGGESTS, BASED_ON, LEADS_TO, ANSWERS, CONTRADICTS, etc.

### Crypto Domain

Node types include: Layer0, Layer1, Layer2, Token, Organization, DApp, Protocol, etc.

Relationship types include: BUILDS_ON, CONNECTS, ISSUES, DEVELOPS, SUPPORTS, etc.

### Media Domain

Node types include: Artist, Album, Song, Tour, Award, Media, RecordLabel, etc.

Relationship types include: RELEASED, CONTAINS, COLLABORATED_ON, FEATURING, WROTE, etc.

## Example Outputs

### Schema Output Example

The `get_graph_schema` tool returns JSON in the following format:

```json
{
  "nodeTypes": [
    { "type": "Person", "count": 150 },
    { "type": "Movie", "count": 75 },
    { "type": "Director", "count": 35 }
  ],
  "nodeProperties": {
    "Person": ["name", "born", "died"],
    "Movie": ["title", "released", "tagline"],
    "Director": ["name", "born"]
  },
  "relationshipTypes": [
    { "type": "ACTED_IN", "count": 253 },
    { "type": "DIRECTED", "count": 44 }
  ],
  "relationshipProperties": {
    "ACTED_IN": ["roles"],
    "DIRECTED": []
  }
}
```

When filtering by domain, the output includes the specified domains:

```json
{
  "domains": ["code"],
  "nodeTypes": [
    { "type": "File", "count": 230 },
    { "type": "Function", "count": 189 },
    { "type": "Class", "count": 45 }
  ],
  "nodeProperties": {
    "File": ["path", "language", "size"],
    "Function": ["name", "parameters", "returnType"],
    "Class": ["name", "methods"]
  },
  "relationshipTypes": [
    { "type": "CONTAINS", "count": 412 },
    { "type": "IMPORTS", "count": 156 }
  ],
  "relationshipProperties": {
    "CONTAINS": [],
    "IMPORTS": ["isDefault"]
  }
}
```

### Query Output Example

The `run_cypher_query` tool returns JSON in the following format:

```json
[
  {
    "n": {
      "identity": "1:0",
      "labels": ["Person"],
      "properties": {
        "name": "Tom Hanks",
        "born": 1956
      }
    }
  },
  {
    "n": {
      "identity": "1:1",
      "labels": ["Person"],
      "properties": {
        "name": "Meg Ryan",
        "born": 1961
      }
    }
  }
]
```

## Development

### Building the Project

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the server
npm start
```

### Running Tests

```bash
npm test
```

## Troubleshooting

### Connection Issues

If you encounter connection issues with Neo4j:

1. Verify your Neo4j database is running
2. Check that your environment variables are correctly set
3. Ensure your Neo4j user has the appropriate permissions
4. Check for network issues or firewall settings that might block connections

### Schema Retrieval Issues

If schema retrieval is slow or fails:

1. For large databases, consider using domain filtering to reduce the amount of data processed
2. Ensure your Neo4j instance has adequate resources
3. Check Neo4j logs for any errors or performance issues