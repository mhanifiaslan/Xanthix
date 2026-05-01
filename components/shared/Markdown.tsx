'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
}

/**
 * Renders trusted (server-produced) Markdown for project sections.
 *
 * - GitHub-flavored Markdown (tables, task lists, strikethrough).
 * - Raw HTML is intentionally NOT enabled — Vertex output is treated as
 *   text only, no HTML escape hatch.
 * - All elements receive light dark-theme classes so the section card
 *   reads cleanly without depending on @tailwindcss/typography defaults.
 */
export default function Markdown({ children }: MarkdownProps) {
  return (
    <div className="markdown-body text-sm leading-relaxed text-[var(--color-text-primary)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-lg font-semibold mt-6 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-base font-semibold mt-5 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-semibold uppercase tracking-wide mt-4 mb-1.5 text-[var(--color-text-secondary)]">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="text-sm font-semibold mt-3 mb-1">{children}</h5>
          ),
          p: ({ children }) => (
            <p className="my-3 text-[var(--color-text-primary)]">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--color-accent)] hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-text-primary)]">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[var(--color-accent)]/40 pl-4 text-[var(--color-text-secondary)] italic">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children, ...rest }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          } & React.HTMLAttributes<HTMLElement>) => {
            if (inline) {
              return (
                <code
                  {...rest}
                  className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[var(--color-accent)] text-[0.85em]"
                >
                  {children}
                </code>
              );
            }
            return (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-white/5 bg-[var(--color-background)] p-3 text-xs">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-6 border-white/5" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/5">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-[10px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top text-[var(--color-text-secondary)]">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
