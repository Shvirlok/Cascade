import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import {
  getItineraryGraph,
  searchUserPreferencesVector,
  updateSegmentStatus,
  logDisruptionEvent,
  rebookCascadeSegment,
} from './tools/db_tools.js';
import {
  queryTransitAvailability,
  estimateCascadeImpact,
} from './tools/transport_tools.js';

dotenv.config();

const mcpServer = new Server(
  {
    name: 'cascade-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_itinerary_graph',
        description: 'Fetch the full transactional travel graph (nodes and edges) for an itinerary from CockroachDB.',
        inputSchema: {
          type: 'object',
          properties: {
            itinerary_id: { type: 'string', description: 'UUID of the itinerary' },
          },
          required: ['itinerary_id'],
        },
      },
      {
        name: 'search_user_preferences_vector',
        description: 'Query user preferences using CockroachDB 1536-dim vector cosine similarity search.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'UUID of the user' },
            target_embedding: {
              type: 'array',
              items: { type: 'number' },
              description: '1536-dimensional embedding vector',
            },
            top_k: { type: 'number', description: 'Number of nearest neighbors to retrieve' },
          },
          required: ['user_id', 'target_embedding'],
        },
      },
      {
        name: 'update_segment_status',
        description: 'Update status and delay parameters for a travel segment in CockroachDB.',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: { type: 'string', description: 'UUID of the segment' },
            status: { type: 'string', description: 'New status (DELAYED, CANCELLED, REBOOKED)' },
            delay_minutes: { type: 'number', description: 'Delay duration in minutes' },
          },
          required: ['segment_id', 'status'],
        },
      },
      {
        name: 'query_transit_availability',
        description: 'Search mock external transit providers (Amtrak, Delta, Hotels) for alternative options.',
        inputSchema: {
          type: 'object',
          properties: {
            transit_type: { type: 'string', description: 'FLIGHT, TRAIN, or HOTEL' },
            origin: { type: 'string', description: 'Origin location/station' },
            destination: { type: 'string', description: 'Destination location/station' },
            earliest_departure: { type: 'string', description: 'ISO timestamp for earliest departure' },
          },
          required: ['transit_type', 'origin', 'destination', 'earliest_departure'],
        },
      },
      {
        name: 'estimate_cascade_impact',
        description: 'Calculate whether a upstream leg delay breaks downstream connecting segments.',
        inputSchema: {
          type: 'object',
          properties: {
            delayed_arrival_iso: { type: 'string' },
            next_departure_iso: { type: 'string' },
            required_buffer_minutes: { type: 'number' },
          },
          required: ['delayed_arrival_iso', 'next_departure_iso'],
        },
      },
      {
        name: 'rebook_cascade_segment',
        description: 'Atomically rebook a segment in CockroachDB transaction, resolving disruption and adjusting itinerary total cost.',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: { type: 'string', description: 'UUID of broken segment to replace' },
            new_provider: { type: 'string', description: 'Name of new provider' },
            new_reference_code: { type: 'string', description: 'New booking reference' },
            new_departure: { type: 'string', description: 'New ISO departure time' },
            new_arrival: { type: 'string', description: 'New ISO arrival time' },
            additional_cost: { type: 'number', description: 'Cost adjustment in USD' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['segment_id', 'new_provider', 'new_reference_code', 'new_departure', 'new_arrival'],
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let resultData: any;

    switch (name) {
      case 'get_itinerary_graph':
        resultData = await getItineraryGraph(String(args?.itinerary_id));
        break;

      case 'search_user_preferences_vector':
        resultData = await searchUserPreferencesVector(
          String(args?.user_id),
          (args?.target_embedding as number[]) || [],
          Number(args?.top_k || 3)
        );
        break;

      case 'update_segment_status':
        resultData = await updateSegmentStatus(
          String(args?.segment_id),
          String(args?.status),
          Number(args?.delay_minutes || 0)
        );
        break;

      case 'query_transit_availability':
        resultData = await queryTransitAvailability(
          String(args?.transit_type),
          String(args?.origin),
          String(args?.destination),
          String(args?.earliest_departure)
        );
        break;

      case 'estimate_cascade_impact':
        resultData = estimateCascadeImpact(
          String(args?.delayed_arrival_iso),
          String(args?.next_departure_iso),
          Number(args?.required_buffer_minutes || 45)
        );
        break;

      case 'rebook_cascade_segment':
        resultData = await rebookCascadeSegment(
          String(args?.segment_id),
          String(args?.new_provider),
          String(args?.new_reference_code),
          String(args?.new_departure),
          String(args?.new_arrival),
          Number(args?.additional_cost || 0),
          (args?.metadata as object) || {}
        );
        break;

      default:
        throw new Error(`Unknown MCP Tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(resultData, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing MCP tool ${name}: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('CASCADE MCP Server started over Stdio transport.');
}

if (process.argv[1]?.includes('server')) {
  startMcpServer().catch((err) => {
    console.error('MCP Server failure:', err);
    process.exit(1);
  });
}
