import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { canonicalCategory } from "@/lib/categories";

interface RelatedTopic {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
}

/**
 * "Keep learning" — links from each lesson to related ones. Two jobs:
 * gives readers an obvious next lesson, and (the SEO reason) creates internal
 * links between topic pages so Googlebot can crawl from any indexed page into
 * the rest of the library instead of relying on the sitemap alone. Uses real
 * <a href> (wouter Link) so the links are followable.
 */
export default function RelatedTopics({ slug }: { slug: string }) {
  const { data: topics = [] } = useQuery<RelatedTopic[]>({
    queryKey: ["/api/topics", slug, "related"],
    enabled: !!slug,
  });

  if (topics.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Keep learning</h2>
          <Link
            href="/topics"
            onClick={() => window.scrollTo(0, 0)}
            className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0"
            data-testid="link-related-browse-all"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`/topic/${t.slug}`}
              onClick={() => window.scrollTo(0, 0)}
              className="group block"
              data-testid={`link-related-${t.slug}`}
            >
              <Card className="card-hover h-full border-card-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {t.category && (
                      <Badge variant="secondary" className="text-xs">
                        {canonicalCategory(t.category)}
                      </Badge>
                    )}
                    {t.estimatedMinutes ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.estimatedMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
