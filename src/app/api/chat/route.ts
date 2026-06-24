import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/claude/client';
import { buildChatSystemPrompt } from '@/lib/claude/prompts';
import { CHAT_TOOLS, executeToolCall } from '@/lib/claude/tools';
import { handleAnthropicError } from '@/lib/claude/errors';
import Anthropic from '@anthropic-ai/sdk';

type MessageParam = Anthropic.Messages.MessageParam;

export async function POST(request: Request) {
  try {
    const { messages, brand_id } = await request.json();

    if (!brand_id || !messages?.length) {
      return new Response(
        JSON.stringify({ error: 'brand_id and messages are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: settings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('brand_id', brand_id)
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Brand settings not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildChatSystemPrompt(settings);
    const anthropic = getAnthropicClient();

    const apiMessages: MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function send(event: Record<string, unknown>) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        }

        try {
          let currentMessages = [...apiMessages];
          let continueLoop = true;

          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20251001',
              max_tokens: 4096,
              system: systemPrompt,
              tools: CHAT_TOOLS,
              messages: currentMessages,
            });

            const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] = [];
            let textContent = '';

            for (const block of response.content) {
              if (block.type === 'text') {
                textContent += block.text;
              } else if (block.type === 'tool_use') {
                toolUseBlocks.push(block);
              }
            }

            if (toolUseBlocks.length > 0) {
              currentMessages.push({
                role: 'assistant',
                content: response.content,
              });

              const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

              for (const toolUse of toolUseBlocks) {
                send({
                  type: 'tool_call',
                  name: toolUse.name,
                  input: toolUse.input,
                });

                const result = await executeToolCall(
                  toolUse.name,
                  toolUse.input as Record<string, unknown>
                );

                send({
                  type: 'tool_result',
                  name: toolUse.name,
                  data: JSON.parse(result),
                });

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: result,
                });
              }

              currentMessages.push({
                role: 'user',
                content: toolResults,
              });
            } else {
              continueLoop = false;

              if (textContent) {
                const chunks = textContent.match(/.{1,100}/gs) || [textContent];
                for (const chunk of chunks) {
                  send({ type: 'text_delta', text: chunk });
                }
              }
            }
          }

          send({ type: 'done' });
        } catch (err) {
          const apiErr = handleAnthropicError(err);
          send({
            type: 'error',
            error: apiErr?.error || 'An unexpected error occurred',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
