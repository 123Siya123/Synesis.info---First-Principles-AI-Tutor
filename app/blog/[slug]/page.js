import { createClient } from '@supabase/supabase-js';
import styles from '../blog.module.css';
import Link from 'next/link';
import { ChevronLeft, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Initialize Supabase (Server-side)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 0;

export async function generateMetadata({ params }) {
    const { data: post } = await supabase
        .from('blog_posts')
        .select('title, excerpt, seo_keywords, published_at')
        .eq('slug', params.slug)
        .single();

    if (!post) {
        return {
            title: 'Post Not Found - Synesis',
        };
    }

    return {
        title: `${post.title} - Synesis Blog`,
        description: post.excerpt,
        keywords: post.seo_keywords,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            publishedTime: post.published_at,
        }
    };
}

export default async function BlogPost({ params }) {
    const { data: post, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .single();

    if (error || !post) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', paddingTop: '5rem' }}>
                <h1>Post not found</h1>
                <Link href="/blog" className={styles.backLink}>
                    <ChevronLeft size={16} /> Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <article className={styles.postContainer}>
            <Link href="/blog" className={styles.backLink}>
                <ChevronLeft size={20} /> Back to Blog
            </Link>

            <header className={styles.postHeader}>
                <h1 className={styles.postTitle}>{post.title}</h1>
                <div className={styles.postMeta}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} />
                        {new Date(post.published_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                </div>
            </header>

            <div className={styles.postContent}>
                <ReactMarkdown
                    components={{
                        // Add custom styles/components if needed
                        img: ({ node, ...props }) => <img style={{ maxWidth: '100%', borderRadius: '12px', margin: '2rem 0' }} {...props} />,
                    }}
                >
                    {post.content}
                </ReactMarkdown>
            </div>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description: post.excerpt,
                        datePublished: post.published_at,
                        author: { // Generic author for now or 'Synesis AI'
                            '@type': 'Organization',
                            name: 'Synesis'
                        },
                    })
                }}
            />
        </article>
    );
}
