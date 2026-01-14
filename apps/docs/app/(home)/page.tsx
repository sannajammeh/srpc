import Link from 'next/link';
import { Zap, Shield, Layers, Globe, Package, GitMerge } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

const features = [
  {
    icon: Shield,
    title: 'Type-Safe',
    description: 'Full TypeScript inference from server to client. No codegen required.',
  },
  {
    icon: Zap,
    title: 'Lightweight',
    description: 'Minimal dependencies with a tiny bundle size. No bloat.',
  },
  {
    icon: Layers,
    title: 'Nested Routers',
    description: 'Organize procedures into logical groups with nested routing.',
  },
  {
    icon: Globe,
    title: 'Framework Agnostic',
    description: 'Works with any server via Fetch API. Edge-runtime compatible.',
  },
  {
    icon: Package,
    title: 'Batching',
    description: 'Combine multiple requests into a single HTTP call.',
  },
  {
    icon: GitMerge,
    title: 'Single Interface',
    description: 'Same API on client and server. One mental model.',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 py-16 md:py-24 max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          sRPC
        </h1>
        <p className="text-lg md:text-xl text-fd-muted-foreground mb-2">
          <span className="font-semibold">s</span>imple{' '}
          <span className="font-semibold">R</span>emote{' '}
          <span className="font-semibold">P</span>rocedure{' '}
          <span className="font-semibold">C</span>all
        </p>
        <p className="text-fd-muted-foreground max-w-2xl mb-8">
          A lightweight, type-safe RPC framework for TypeScript.
          Define once, call anywhere with full type inference.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/docs"
            className="px-6 py-3 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium hover:bg-fd-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/docs/why-srpc"
            className="px-6 py-3 rounded-lg border border-fd-border font-medium hover:bg-fd-accent transition-colors"
          >
            Why sRPC?
          </Link>
        </div>
      </section>

      {/* Code Example */}
      <section className="w-full max-w-4xl px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-4">
          <DynamicCodeBlock
            lang="ts"
            code={`const s = initSRPC();

const router = s.router({
  hello: async (_, name: string) => {
    return \`Hello \${name}!\`;
  },
});

export type Router = typeof router;`}
            codeblock={{ title: 'server.ts' }}
          />
          <DynamicCodeBlock
            lang="ts"
            code={`import type { Router } from './server';

const client = createSRPCClient<Router>({
  endpoint: '/api',
});

// Fully typed!
const msg = await client.hello('World');
// => "Hello World!"`}
            codeblock={{ title: 'client.ts' }}
          />
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl px-4 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Features
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-lg border border-fd-border bg-fd-card"
            >
              <feature.icon className="w-8 h-8 mb-4 text-fd-primary" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-4 py-16 bg-fd-muted/30 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to simplify your RPC?
        </h2>
        <p className="text-fd-muted-foreground mb-8 max-w-xl mx-auto">
          Get started in minutes. Zero configuration, full type safety.
        </p>
        <pre className="inline-block px-6 py-3 rounded-lg bg-fd-card border border-fd-border text-sm mb-6">
          <code>npm install @srpc.org/core</code>
        </pre>
        <div className="flex gap-4 justify-center">
          <Link
            href="/docs"
            className="px-6 py-3 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium hover:bg-fd-primary/90 transition-colors"
          >
            Read the Docs
          </Link>
        </div>
      </section>
    </main>
  );
}
