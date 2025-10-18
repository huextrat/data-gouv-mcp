import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';

// Create an MCP server for data.gouv.fr tabular API
const server = new McpServer({
    name: 'datagouv-tabular-api',
    version: '1.0.0'
});

const BASE_URL = 'https://tabular-api.data.gouv.fr/api';

// Helper function to make API requests with error handling
async function makeApiRequest(url: string): Promise<any> {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'MCP-Datagouv-Server/1.0.0'
            }
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`API request failed: ${error.response?.status} ${error.response?.statusText}`);
        }
        throw new Error(`Network error: ${error}`);
    }
}

// Tool 1: Get resource metadata
server.registerTool(
    'get_resource',
    {
        title: 'Get Resource Metadata',
        description: 'Get metadata and available endpoints for a specific resource by its resource ID (rid)',
        inputSchema: {
            rid: z.string().describe('Resource ID (rid) - found in the metadata tab of a resource on data.gouv.fr')
        }
    },
    async ({ rid }) => {
        const url = `${BASE_URL}/resources/${rid}/`;
        const data = await makeApiRequest(url);
        
        return {
            content: [{
                type: 'text',
                text: `Resource Metadata for ${rid}:\n\n` +
                      `Created: ${data.created_at}\n` +
                      `Original URL: ${data.url}\n\n` +
                      `Available endpoints:\n` +
                      data.links.map((link: any) => `- ${link.rel}: ${link.href}`).join('\n')
            }],
            structuredContent: data
        };
    }
);

// Tool 2: Get resource profile
server.registerTool(
    'get_resource_profile',
    {
        title: 'Get Resource Profile',
        description: 'Get detailed profile information including column descriptions, types, and statistics for a resource',
        inputSchema: {
            rid: z.string().describe('Resource ID (rid)')
        }
    },
    async ({ rid }) => {
        const url = `${BASE_URL}/resources/${rid}/profile/`;
        const data = await makeApiRequest(url);
        
        const profile = data.profile;
        let profileText = `Resource Profile for ${rid}:\n\n`;
        profileText += `Headers: ${profile.header.join(', ')}\n\n`;
        
        if (profile.columns) {
            profileText += 'Column Details:\n';
            Object.entries(profile.columns).forEach(([columnName, columnInfo]: [string, any]) => {
                profileText += `\n${columnName}:\n`;
                profileText += `  Type: ${columnInfo.python_type}\n`;
                if (columnInfo.format) {
                    profileText += `  Format: ${columnInfo.format} (confidence: ${columnInfo.score})\n`;
                }
                profileText += `  Distinct values: ${columnInfo.nb_distinct}\n`;
                profileText += `  Missing values: ${columnInfo.nb_missing_values}\n`;
                if (columnInfo.tops && columnInfo.tops.length > 0) {
                    profileText += `  Top values: ${columnInfo.tops.slice(0, 5).join(', ')}\n`;
                }
            });
        }
        
        return {
            content: [{
                type: 'text',
                text: profileText
            }],
            structuredContent: data
        };
    }
);

// Tool 3: Get resource data with filtering and pagination
server.registerTool(
    'get_resource_data',
    {
        title: 'Get Resource Data',
        description: 'Get paginated data from a resource with optional filtering and sorting',
        inputSchema: {
            rid: z.string().describe('Resource ID (rid)'),
            page: z.number().optional().describe('Page number (default: 1)'),
            page_size: z.number().optional().describe('Number of items per page (default: 20, max: 100)'),
            filters: z.record(z.string()).optional().describe('Filters to apply (e.g., {"column_name__exact": "value"})'),
            sort: z.string().optional().describe('Sort column (e.g., "column_name__sort=asc" or "column_name__sort=desc")')
        }
    },
    async ({ rid, page = 1, page_size = 20, filters = {}, sort }) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('page_size', Math.min(page_size, 100).toString());
        
        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
            params.append(key, String(value));
        });
        
        // Add sort if provided
        if (sort) {
            params.append(sort, '');
        }
        
        const url = `${BASE_URL}/resources/${rid}/data/?${params.toString()}`;
        const data = await makeApiRequest(url);
        
        let dataText = `Resource Data for ${rid} (Page ${data.meta.page} of ${Math.ceil(data.meta.total / data.meta.page_size)}):\n\n`;
        dataText += `Total records: ${data.meta.total}\n`;
        dataText += `Records on this page: ${data.data.length}\n\n`;
        
        if (data.data.length > 0) {
            dataText += 'Sample data:\n';
            data.data.slice(0, 3).forEach((record: any, index: number) => {
                dataText += `\nRecord ${index + 1}:\n`;
                Object.entries(record).forEach(([key, value]) => {
                    dataText += `  ${key}: ${value}\n`;
                });
            });
            
            if (data.data.length > 3) {
                dataText += `\n... and ${data.data.length - 3} more records on this page\n`;
            }
        }
        
        return {
            content: [{
                type: 'text',
                text: dataText
            }],
            structuredContent: data
        };
    }
);

// Tool 4: Search for resources by dataset
server.registerTool(
    'search_resources',
    {
        title: 'Search Resources',
        description: 'Search for resources by dataset title or description on data.gouv.fr',
        inputSchema: {
            query: z.string().describe('Search query (dataset title, description, etc.)'),
            limit: z.number().optional().describe('Maximum number of results to return (default: 10)')
        }
    },
    async ({ query, limit = 10 }) => {
        // Note: This uses the main data.gouv.fr API, not the tabular API
        const searchUrl = `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query)}&page_size=${limit}`;
        const data = await makeApiRequest(searchUrl);
        
        let searchText = `Search results for "${query}":\n\n`;
        searchText += `Found ${data.total} datasets\n\n`;
        
        data.data.forEach((dataset: any, index: number) => {
            searchText += `${index + 1}. ${dataset.title}\n`;
            searchText += `   Organization: ${dataset.organization?.name || 'Unknown'}\n`;
            searchText += `   Description: ${dataset.description?.substring(0, 100)}...\n`;
            searchText += `   Resources: ${dataset.resources?.length || 0}\n`;
            
            // Show tabular resources
            const tabularResources = dataset.resources?.filter((r: any) => 
                ['csv', 'xls', 'xlsx'].includes(r.format?.toLowerCase())
            ) || [];
            
            if (tabularResources.length > 0) {
                searchText += `   Tabular resources:\n`;
                tabularResources.forEach((resource: any) => {
                    searchText += `     - ${resource.title} (${resource.format})\n`;
                    if (resource.id) {
                        searchText += `       Resource ID: ${resource.id}\n`;
                    }
                });
            }
            searchText += '\n';
        });
        
        return {
            content: [{
                type: 'text',
                text: searchText
            }],
            structuredContent: data
        };
    }
);

// Tool 5: Get available filters and sorts for a resource
server.registerTool(
    'get_resource_swagger',
    {
        title: 'Get Resource API Documentation',
        description: 'Get the Swagger documentation for a resource showing available filters and sorts',
        inputSchema: {
            rid: z.string().describe('Resource ID (rid)')
        }
    },
    async ({ rid }) => {
        const url = `${BASE_URL}/resources/${rid}/swagger/`;
        const data = await makeApiRequest(url);
        
        let swaggerText = `API Documentation for Resource ${rid}:\n\n`;
        
        if (data.paths && data.paths['/data/'] && data.paths['/data/'].get) {
            const getOperation = data.paths['/data/'].get;
            swaggerText += `Available parameters:\n`;
            
            if (getOperation.parameters) {
                getOperation.parameters.forEach((param: any) => {
                    swaggerText += `\n${param.name}:\n`;
                    swaggerText += `  Type: ${param.type}\n`;
                    swaggerText += `  Required: ${param.required ? 'Yes' : 'No'}\n`;
                    if (param.description) {
                        swaggerText += `  Description: ${param.description}\n`;
                    }
                    if (param.enum) {
                        swaggerText += `  Possible values: ${param.enum.join(', ')}\n`;
                    }
                });
            }
        }
        
        return {
            content: [{
                type: 'text',
                text: swaggerText
            }],
            structuredContent: data
        };
    }
);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'healthy', 
        service: 'datagouv-tabular-api-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint with service info
app.get('/', (req: Request, res: Response) => {
    res.json({
        service: 'Data.gouv.fr Tabular API MCP Server',
        version: '1.0.0',
        description: 'MCP server for accessing French open data through data.gouv.fr tabular API',
        endpoints: {
            mcp: '/mcp',
            health: '/health'
        },
        documentation: 'https://github.com/huextrat/data-gouv-mcp'
    });
});

app.post('/mcp', async (req: Request, res: Response) => {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '8000');
app.listen(port, () => {
    console.log(`Data.gouv.fr Tabular API MCP Server running on http://localhost:${port}/mcp`);
    console.log('Available tools:');
    console.log('- get_resource: Get resource metadata');
    console.log('- get_resource_profile: Get column descriptions and statistics');
    console.log('- get_resource_data: Get paginated data with filtering');
    console.log('- search_resources: Search for datasets and resources');
    console.log('- get_resource_swagger: Get API documentation for filters/sorts');
}).on('error', (error: Error) => {
    console.error('Server error:', error);
    process.exit(1);
});