'use client';

import React from 'react';
import Markdown from './Markdown';
import GanttView from './GanttView';

interface SectionView {
  id: string;
  order: number;
  title: string;
  content: string;
  outputType: string;
  status: string;
}

interface PrintableViewProps {
  projectTitle: string;
  projectIdea: string;
  projectTypeSlug: string;
  sections: SectionView[];
}

export const PrintableView = React.forwardRef<HTMLDivElement, PrintableViewProps>(
  ({ projectTitle, projectIdea, projectTypeSlug, sections }, ref) => {
    // Only print ready sections
    const readySections = sections.filter((s) => s.status === 'ready').sort((a, b) => a.order - b.order);

    return (
      <div ref={ref} className="print-only-container hidden print:block text-black bg-white p-8 max-w-[800px] mx-auto font-sans leading-relaxed">
        {/* Print specific styles to ensure colors print and page breaks work */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body { background: white; color: black; }
            .print-only-container { display: block !important; }
            .page-break { page-break-before: always; }
            a { color: black !important; text-decoration: none !important; }
            pre { border: 1px solid #ddd; padding: 10px; background: #f9f9f9; }
            code { background: #f1f1f1; padding: 2px 4px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          }
        `}} />

        {/* Cover Page */}
        <div className="flex flex-col items-center justify-center min-h-[1000px] text-center">
          <h1 className="text-5xl font-extrabold mb-8 text-gray-900">{projectTitle}</h1>
          <h2 className="text-2xl text-gray-600 mb-16 italic">{projectTypeSlug} Projesi</h2>
          
          <div className="text-left bg-gray-50 border border-gray-200 p-8 rounded-xl max-w-2xl w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wider">Proje Fikri</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{projectIdea}</p>
          </div>
          
          <div className="mt-24 text-gray-400 text-sm">
            Xanthix.ai tarafından oluşturuldu
            <br/>
            {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Sections */}
        {readySections.map((section, idx) => (
          <div key={section.id} className="page-break mt-16 pt-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-2 border-gray-200 pb-4">
              {idx + 1}. {section.title}
            </h2>
            <div className="prose prose-slate max-w-none prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-800">
              {section.outputType === 'gantt' ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <GanttView content={section.content} />
                </div>
              ) : (
                <Markdown>{section.content}</Markdown>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

PrintableView.displayName = 'PrintableView';
