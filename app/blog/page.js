import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import styles from './blog.module.css';
import { Clock, ArrowRight, ChevronLeft } from 'lucide-react';

// Initialize Supabase Client (Server-side)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 0; // Disable caching to see new posts immediately

export const metadata = {
    title: 'Synesis Blog - Deep Learning Insights',
    description: 'Explore deep insights, learning strategies, and first-principles thinking on the Synesis blog.',
    openGraph: {
        title: 'Synesis Blog - Deep Learning Insights',
        description: 'Explore deep insights, learning strategies, and first-principles thinking on the Synesis blog.',
        siteName: 'Synesis',
    }
};

export default async function BlogIndex() {
    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at')
        .order('published_at', { ascending: false });

    if (error) {
        console.error("Error fetching posts:", error);
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ position: 'absolute', left: 0, top: '4rem' }}>
                    <Link href="/" className={styles.backLink}>
                        <ChevronLeft size={20} /> Back to App
                    </Link>
                </div>
                <h1 className={styles.title}>Synesis Blog</h1>
                <p className={styles.subtitle}>
                    Deep dives into learning, intelligence, and the art of understanding.
                </p>
            </header>

            <div className={styles.grid}>
                {posts && posts.length > 0 ? (
                    posts.map((post) => (
                        <Link key={post.id} href={`/blog/${post.slug}`} className={styles.cardLink_wrapper} style={{ textDecoration: 'none' }}>
                            <article className={styles.card}>
                                <div>
                                    <div className={styles.cardDate}>
                                        <Clock size={14} />
                                        {new Date(post.published_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <h2 className={styles.cardTitle}>{post.title}</h2>
                                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                                </div>
                                <div className={styles.cardLink} style={{ marginTop: 'auto' }}>
                                    Read Article <ArrowRight size={16} />
                                </div>
                            </article>
                        </Link>
                    ))
                ) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '4rem' }}>
                        <p>No posts published yet. Check back soon!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
