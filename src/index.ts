import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getNeo4jSchema, closeDriver, checkNeo4jConnectivity, runCypherQuery } from "./neo4j-client.js";

async function main() {
  console.error("Starting Sage MCP Server..."); // Use console.error

  // Optional: Check Neo4j connectivity on startup
  try {
    await checkNeo4jConnectivity(); // Removed 'wai' typo
  } catch (error) {
    console.error("Failed to connect to Neo4j on startup. Exiting.", error);
    process.exit(1); // Exit if cannot connect initially
  }

  // Create an MCP server
  const server = new McpServer({
    name: "sage", // Server name as requested
    version: "1.0.0"
  });

  // Add the get-graph-schema tool with optional domain parameter (string or array)
  server.tool(
    "get_graph_schema",
    {
      domain: z.union([
        z.string(),
        z.array(z.string())
      ]).optional().describe("Optional domain to filter schema (code, mind, crypto)")
    },
    async ({ domain }) => {
      const domainLog = domain
        ? Array.isArray(domain)
          ? ` for domains: ${domain.join(', ')}`
          : ` for domain: ${domain}`
        : '';
      console.error(`Tool 'get-graph-schema' called${domainLog}.`); // Use console.error
      try {
        const schemaJsonString = await getNeo4jSchema(domain);
        const domainSuccessLog = domain
          ? Array.isArray(domain)
            ? ` for domains: ${domain.join(', ')}`
            : ` for domain: ${domain}`
          : '';
        console.error(`Successfully retrieved Neo4j schema${domainSuccessLog}.`); // Use console.error
        return {
          content: [{ type: "text", text: schemaJsonString }]
        };
      } catch (error: unknown) {
        console.error("Error executing 'get-graph-schema' tool:", error);
        const message = error instanceof Error ? error.message : String(error);
        // Return error information in the MCP response
        return {
          content: [{ type: "text", text: `Error getting schema: ${message}` }],
          isError: true
        };
      }
    }
  );

  // Add the run-cypher-query tool
  server.tool(
    "run_cypher_query",
    {
      query: z.string().describe("The Cypher query string to execute."),
      params: z.record(z.any()).optional().describe("Optional parameters object for the Cypher query.")
    },
    async ({ query, params }) => {
      console.error(`Tool 'run-cypher-query' called with query: ${query}`);
      try {
        // Ensure params is an object if provided, default to empty object if undefined
        const queryParams = params ?? {};
        const resultJsonString = await runCypherQuery(query, queryParams);
        console.error(`Successfully executed Cypher query: ${query}`);
        return {
          content: [{ type: "text", text: resultJsonString }]
        };
      } catch (error: unknown) {
        console.error(`Error executing 'run-cypher-query' tool with query: ${query}`, error);
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error running query: ${message}` }],
          isError: true
        };
      }
    }
  );

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();

  // Handle graceful shutdown
  const cleanup = async () => {
    console.error("Shutting down Sage MCP Server..."); // Use console.error
    await closeDriver(); // Close Neo4j connection
    transport.close(); // Close MCP transport
    server.close(); // Close MCP server
    console.error("Server shut down gracefully."); // Use console.error
    process.exit(0);
  };

  process.on('SIGINT', cleanup); // Ctrl+C
  process.on('SIGTERM', cleanup); // Termination signal

  try {
    await server.connect(transport);
    console.error("Sage MCP Server connected via stdio and ready."); // Use console.error
  } catch (error) {
    console.error("Failed to connect MCP server:", error);
    await closeDriver(); // Ensure driver is closed on connection failure
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error during server startup:", error);
  process.exit(1);
});
