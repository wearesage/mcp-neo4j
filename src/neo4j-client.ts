import neo4j from 'neo4j-driver';
import type { Driver, Session, Integer } from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

let driver: Driver | null = null;

function getDriver(): Driver {
  const NEO4J_URI_ENV = process.env.NEO4J_URI;
  const NEO4J_USER_ENV = process.env.NEO4J_USER;
  const NEO4J_PASSWORD_ENV = process.env.NEO4J_PASSWORD;

  if (!NEO4J_URI_ENV || !NEO4J_USER_ENV || !NEO4J_PASSWORD_ENV) {
    console.error("Current process.env:", process.env);
    throw new Error('Missing Neo4j connection details in environment variables (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)');
  }
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI_ENV, neo4j.auth.basic(NEO4J_USER_ENV, NEO4J_PASSWORD_ENV));
  }
  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.error('Neo4j driver closed.');
  }
}

export async function checkNeo4jConnectivity(): Promise<boolean> {
  const currentDriver = getDriver();
  try {
    await currentDriver.verifyConnectivity();
    console.error('Neo4j connection verified successfully.');
    return true;
  } catch (error: unknown) {
    console.error('Neo4j connection verification failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Neo4j connection failed: ${message}`);
  }
}

/**
 * Recursively process parameters to convert numbers to Neo4j integers
 * This ensures that numeric parameters like LIMIT are properly handled
 */
function processParams(params: Record<string, any>): Record<string, any> {
  const processed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number') {
      // Convert numbers to Neo4j integers
      processed[key] = neo4j.int(Math.floor(value));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively process nested objects
      processed[key] = processParams(value);
    } else if (Array.isArray(value)) {
      // Process arrays
      processed[key] = value.map(item =>
        typeof item === 'number' ? neo4j.int(Math.floor(item)) : item
      );
    } else {
      // Pass through other values unchanged
      processed[key] = value;
    }
  }
  
  return processed;
}

export async function runCypherQuery<T>(query: string, params: Record<string, T> = {}): Promise<string> {
  const currentDriver = getDriver();
  let session: Session | null = null;
  try {
    // Process parameters to convert numbers to Neo4j integers
    const processedParams = processParams(params as Record<string, any>);
    
    session = currentDriver.session();
    console.error(`Executing Cypher: ${query} with params: ${JSON.stringify(processedParams)}`);
    const result = await session.run(query, processedParams);
    const records = result.records.map(record => record.toObject());
    console.error(`Cypher query executed successfully. Records returned: ${records.length}`);
    return JSON.stringify(records, null, 2);
  } catch (error: unknown) {
    console.error(`Error executing Cypher query: ${query}`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute Cypher query: ${message}`);
  } finally {
    if (session) {
      await session.close();
    }
  }
}

// Domain-specific node types
const DOMAIN_NODE_TYPES = {
  code: [
    "Codebase", "Package", "Directory", "File", "Module", "Namespace", "Class",
    "Interface", "Enum", "TypeAlias", "Function", "Method", "Constructor",
    "Property", "Variable", "Parameter", "JsxElement", "JsxAttribute", "Test",
    "Component", "Dependency", "TypeDefinition", "ASTNodeInfo", "InterfaceProperty",
    "VueComponent", "ComponentTemplate", "ComponentScript", "ComponentStyle",
    "Prop", "Emit", "ReactiveState", "Composable", "SassVariable", "SassMixin", "SassModule"
  ],
  mind: [
    "Hypothesis", "Reflection", "Insight", "Question", "Decision", "Pattern",
    "Task", "Subtask", "Agent", "Verification", "Result", "Orientation"
  ],
  crypto: [
    "Layer0", "Layer1", "Layer2", "Layer3", "Token", "InteroperabilitySolution", "Organization",
    "Event", "Person", "DApp", "Protocol", "Validator", "GovernanceStructure",
    "RegulatoryApproach", "TechnicalArchitecture", "UserDemographic",
    // Enhanced L2 schema
    "L2Sequencer", "L2Validator", "L2DApp", "L2Bridge", "L2SecurityIncident"
  ],
  media: [
    "Artist", "Album", "Song", "Tour", "Residency", "Award", "Media", "RecordLabel",
    "Event", "Organization", "Product", "Location", "Genre", "LyricSection",
    "Annotation", "Theme", "LinguisticDevice", "Source"
  ]
};

// Domain-specific relationship types
const DOMAIN_RELATIONSHIP_TYPES = {
  code: [
    "IMPORTS", "IMPORTS_FROM_PACKAGE", "IMPORTS_TYPES", "IMPORTS_TYPES_FROM_PACKAGE",
    "EXPORTS_LOCAL", "EXPORTS_DEFAULT", "REEXPORTS", "REEXPORTS_FROM_PACKAGE",
    "REEXPORTS_ALL", "EXTENDS", "INTERFACE_EXTENDS", "IMPLEMENTS", "CALLS",
    "CONTAINS", "HAS_METHOD", "HAS_PARAMETER", "HAS_PROPERTY", "REFERENCES_TYPE",
    "REFERENCES_VARIABLE", "DEPENDS_ON", "IS_DECORATED_BY", "TESTS", "RENDERS",
    "USES_HOOK", "AST_PARENT_CHILD", "DEFINES_VARIABLE", "DEFINES_FUNCTION",
    "DEFINES_INTERFACE", "DEFINES_CLASS", "DEFINES_TYPE_ALIAS", "DEFINES_ENUM",
    "DEFINES_NAMESPACE", "DEFINES_MODULE", "DEFINES_COMPONENT", "DEFINES_VUE_COMPONENT",
    "PROVIDES_PROPS", "LISTENS_TO", "USES_SLOT", "USES_COMPOSABLE", "IMPORTS_AUTO",
    "REGISTERS_AUTO", "IMPORTS_SASS", "USES_VARIABLE", "INCLUDES_MIXIN"
  ],
  mind: [
    "SUGGESTS", "BASED_ON", "LEADS_TO", "ANSWERS", "CONTRADICTS", "REFINES",
    "IDENTIFIES", "EVOLVES_TO", "APPLIES_TO", "IMPLEMENTS_DECISION", "ADDRESSES",
    "RESOLVES", "APPLIES", "MODIFIES", "TASK_DEPENDS_ON", "TASK_BLOCKED_BY",
    "DECOMPOSES_TO", "EXECUTED_BY", "VERIFIED_BY"
  ],
  crypto: [
    "BUILDS_ON", "CONNECTS", "ISSUES", "DEVELOPS", "SUPPORTS", "BRIDGES", "PARTNERS_WITH",
    "COMPETES_WITH", "FORKED_FROM", "INVESTED_IN", "GOVERNS", "INFLUENCED_BY",
    "PARTICIPATES_IN_GOVERNANCE", "CONTRIBUTES_REVENUE_TO", "HAS_REGULATORY_APPROACH",
    "HAS_TECHNICAL_ARCHITECTURE", "HAS_USER_DEMOGRAPHIC", "PROVIDES_TECHNOLOGY", "RELATES_TO",
    // Enhanced L2 schema relationships
    "SECURES", "L2_BRIDGES", "HOSTS", "AUDITS", "UPGRADES"
  ],
  media: [
    "BORN_IN", "HAS_FAMILY_RELATIONSHIP", "RELEASED", "CONTAINS", "HEADLINED",
    "SUPPORTED", "COLLABORATED_ON", "FEATURING", "WROTE", "PRODUCED",
    "SIGNED_WITH", "RELEASED_BY", "RECEIVED", "ACTED_IN", "VOICED_IN",
    "APPEARED_IN", "JUDGED", "HOSTED", "PERFORMED_AT", "INFLUENCED_BY",
    "HAS_GENRE", "ENDORSED", "LAUNCHED", "FOUNDED", "SUPPORTS",
    "AMBASSADOR_FOR", "HELD_IN", "MUSIC_VIDEO_FOR", "HAS_LYRICS",
    "IS_ANNOTATED_BY", "REFERENCES_SOURCE", "PROVIDED_BY_USER",
    "EXPLORES_THEME", "IDENTIFIES_THEME", "EMPLOYS_DEVICE", "IDENTIFIES_DEVICE"
  ]
};

// New improved schema retrieval function with domain filtering
export async function getNeo4jSchema(domain?: string | string[]): Promise<string> {
  const currentDriver = getDriver();
  let session: Session | null = null;
  try {
    session = currentDriver.session();

    // Get all node types with counts
    const nodeTypesResult = await session.run(`
      MATCH (n)
      WITH labels(n) as labels
      UNWIND labels as label
      RETURN label, count(*) as count
      ORDER BY count DESC
    `);

    // Get node properties for each type
    const nodePropertiesResult = await session.run(`
      MATCH (n)
      WITH labels(n) as labels, keys(n) as keys
      UNWIND labels as label
      UNWIND keys as key
      RETURN label, collect(DISTINCT key) as properties
    `);

    // Get all relationship types with counts
    const relationshipTypesResult = await session.run(`
      MATCH ()-[r]->()
      WITH type(r) as relType
      RETURN relType, count(*) as count
      ORDER BY count DESC
    `);

    // Get relationship properties for each type
    const relationshipPropertiesResult = await session.run(`
      MATCH ()-[r]->()
      WITH type(r) as relType, keys(r) as keys
      UNWIND keys as key
      RETURN relType, collect(DISTINCT key) as properties
    `);

    let nodeTypes = nodeTypesResult.records.map(record => ({
      type: record.get('label'),
      count: record.get('count').toNumber()
    }));

    const nodeProperties: { [key: string]: string[] } = {};
    for (const record of nodePropertiesResult.records) {
      const label = record.get('label');
      const properties = record.get('properties');
      if (!nodeProperties[label]) {
        nodeProperties[label] = [];
      }
      nodeProperties[label] = [...new Set([...nodeProperties[label], ...properties])];
    }

    let relationshipTypes = relationshipTypesResult.records.map(record => ({
      type: record.get('relType'),
      count: record.get('count').toNumber()
    }));

    const relationshipProperties: { [key: string]: string[] } = {};
    for (const record of relationshipPropertiesResult.records) {
      const relType = record.get('relType');
      const properties = record.get('properties');
      if (!relationshipProperties[relType]) {
        relationshipProperties[relType] = [];
      }
      relationshipProperties[relType] = [...new Set([...relationshipProperties[relType], ...properties])];
    }

    // Filter by domain if specified
    if (domain) {
      // Convert single domain to array for consistent processing
      const domains = Array.isArray(domain) ? domain : [domain];
      // Filter to only include valid domains
      const validDomains = domains.filter(d => ['code', 'mind', 'crypto', 'media'].includes(d));
      
      if (validDomains.length === 0) {
        // No valid domains provided, return full schema
        const schemaOutput = {
          nodeTypes,
          nodeProperties,
          relationshipTypes,
          relationshipProperties
        };
        return JSON.stringify(schemaOutput);
      }
      
      // Collect node and relationship types from all specified domains
      let allDomainNodeTypes: string[] = [];
      let allDomainRelationshipTypes: string[] = [];
      
      // Gather all node and relationship types from the specified domains
      for (const d of validDomains) {
        const domainNodeTypesForThisDomain = DOMAIN_NODE_TYPES[d as keyof typeof DOMAIN_NODE_TYPES];
        const domainRelationshipTypesForThisDomain = DOMAIN_RELATIONSHIP_TYPES[d as keyof typeof DOMAIN_RELATIONSHIP_TYPES];
        
        allDomainNodeTypes = [...allDomainNodeTypes, ...domainNodeTypesForThisDomain];
        allDomainRelationshipTypes = [...allDomainRelationshipTypes, ...domainRelationshipTypesForThisDomain];
      }
      
      // Remove duplicates
      allDomainNodeTypes = [...new Set(allDomainNodeTypes)];
      allDomainRelationshipTypes = [...new Set(allDomainRelationshipTypes)];
      
      // Filter existing node types by domain and add missing ones with count 0
      const existingNodeTypes = new Set(nodeTypes.map(nt => nt.type));
      const completeNodeTypes = [...nodeTypes.filter(nt => allDomainNodeTypes.includes(nt.type))];
      
      // Add node types from our hard-coded list that don't exist in the database yet
      for (const nodeType of allDomainNodeTypes) {
        if (!existingNodeTypes.has(nodeType)) {
          completeNodeTypes.push({
            type: nodeType,
            count: 0
          });
        }
      }
      
      // Filter existing relationship types by domain and add missing ones with count 0
      const existingRelTypes = new Set(relationshipTypes.map(rt => rt.type));
      const completeRelationshipTypes = [...relationshipTypes.filter(rt => allDomainRelationshipTypes.includes(rt.type))];
      
      // Add relationship types from our hard-coded list that don't exist in the database yet
      for (const relType of allDomainRelationshipTypes) {
        if (!existingRelTypes.has(relType)) {
          completeRelationshipTypes.push({
            type: relType,
            count: 0
          });
        }
      }
      
      // Filter node properties to only include domain-specific node types
      const filteredNodeProperties: { [key: string]: string[] } = {};
      for (const nodeType of allDomainNodeTypes) {
        if (nodeProperties[nodeType]) {
          filteredNodeProperties[nodeType] = nodeProperties[nodeType];
        } else {
          // Add empty array for node types that don't exist in the database yet
          filteredNodeProperties[nodeType] = [];
        }
      }
      
      // Filter relationship properties to only include domain-specific relationship types
      const filteredRelationshipProperties: { [key: string]: string[] } = {};
      for (const relType of allDomainRelationshipTypes) {
        if (relationshipProperties[relType]) {
          filteredRelationshipProperties[relType] = relationshipProperties[relType];
        } else {
          // Add empty array for relationship types that don't exist in the database yet
          filteredRelationshipProperties[relType] = [];
        }
      }
      
      const schemaOutput = {
        domains: validDomains,
        nodeTypes: completeNodeTypes,
        nodeProperties: filteredNodeProperties,
        relationshipTypes: completeRelationshipTypes,
        relationshipProperties: filteredRelationshipProperties
      };
      
      return JSON.stringify(schemaOutput);
    }

    const schemaOutput = {
      nodeTypes,
      nodeProperties,
      relationshipTypes,
      relationshipProperties
    };

    return JSON.stringify(schemaOutput);
  } catch (error: unknown) {
    console.error('Error fetching Neo4j schema:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Neo4j schema: ${message}`);
  } finally {
    if (session) {
      await session.close();
    }
  }
}
