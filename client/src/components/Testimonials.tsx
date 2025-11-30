import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

// todo: remove mock functionality
const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Software Engineer",
    avatar: "",
    content: "Finally understood quantum mechanics after years of confusion. The first principles approach made everything click into place.",
    rating: 5,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Entrepreneur",
    avatar: "",
    content: "Started my business using the frameworks I learned here. The way they break down complex business concepts is brilliant.",
    rating: 5,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    role: "Graduate Student",
    avatar: "",
    content: "The interactive quizzes are addictive! I actually look forward to learning now. It's like Duolingo but for real knowledge.",
    rating: 5,
  },
  {
    id: "4",
    name: "David Kim",
    role: "Data Scientist",
    avatar: "",
    content: "The ML course helped me understand what I was doing instead of just copying code. Fundamentals matter!",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-testimonials-title">
            Loved by Curious Minds
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of learners who've transformed their understanding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id}
              className="border-card-border"
              data-testid={`card-testimonial-${testimonial.id}`}
            >
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {testimonial.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
