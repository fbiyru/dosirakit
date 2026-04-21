import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { scrapeUrl } from '@/lib/firecrawl/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(request);
    }

    const { source, value, brand_id } = await request.json();

    if (!source || !value) {
      return NextResponse.json(
        { error: 'source and value are required' },
        { status: 400 }
      );
    }

    switch (source) {
      case 'archive':
        return handleArchive(value, brand_id);
      case 'url':
        return handleUrl(value);
      case 'gdocs':
        return handleGoogleDocs(value);
      default:
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }
  } catch (err) {
    console.error('Extract error:', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleArchive(articleId: string, brandId: string) {
  if (!brandId) {
    return NextResponse.json({ error: 'brand_id is required for archive source' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('article_content')
    .select('title, body')
    .eq('article_id', articleId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Article not found or has no content' },
      { status: 404 }
    );
  }

  const content = data.title ? `# ${data.title}\n\n${data.body || ''}` : (data.body || '');

  return NextResponse.json({
    content,
    source_label: `Archive article: ${data.title || articleId}`,
  });
}

async function handleUrl(url: string) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const result = await scrapeUrl(url);

  if (!result.markdown || result.markdown.trim().length < 50) {
    return NextResponse.json(
      { error: 'Could not extract meaningful content from this URL.' },
      { status: 422 }
    );
  }

  return NextResponse.json({
    content: result.markdown,
    source_label: result.title || url,
  });
}

async function handleGoogleDocs(url: string) {
  const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!docIdMatch) {
    return NextResponse.json(
      { error: 'Could not find a Google Docs document ID in that URL.' },
      { status: 400 }
    );
  }

  const docId = docIdMatch[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const res = await fetch(exportUrl, { redirect: 'follow' });

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          res.status === 404
            ? 'Document not found. Check the URL is correct.'
            : 'Could not access this document. Make sure sharing is set to "Anyone with the link can view".',
      },
      { status: 422 }
    );
  }

  const responseContentType = res.headers.get('content-type') || '';
  if (responseContentType.includes('text/html')) {
    return NextResponse.json(
      {
        error:
          'Google returned a login page instead of the document. Set the sharing to "Anyone with the link can view" and try again.',
      },
      { status: 422 }
    );
  }

  const text = await res.text();

  if (text.trim().length < 50) {
    return NextResponse.json(
      { error: 'Document appears to be empty or too short.' },
      { status: 422 }
    );
  }

  return NextResponse.json({
    content: text,
    source_label: `Google Doc: ${docId}`,
  });
}

async function handleFileUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10 MB.' },
      { status: 400 }
    );
  }

  const name = file.name.toLowerCase();

  if (name.endsWith('.txt')) {
    const text = await file.text();
    return NextResponse.json({ content: text, source_label: file.name });
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer });
    const text = result.value
      .replace(/<\/?(p|br|div|h[1-6])[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from this .docx file.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ content: text, source_label: file.name });
  }

  if (name.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);

    if (!result.text || result.text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            'Could not extract text from this PDF. It may be image-based or scanned — only text-based PDFs are supported.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ content: result.text, source_label: file.name });
  }

  return NextResponse.json(
    { error: 'Unsupported file type. Upload a .txt, .docx, or .pdf file.' },
    { status: 400 }
  );
}
