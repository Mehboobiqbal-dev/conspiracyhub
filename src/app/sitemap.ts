import { MetadataRoute } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/topics`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
  ];

  try {
    // Add all published posts
    const postsCollection = await getCollection<Post>('posts');
    const posts = await postsCollection
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    posts.forEach((post) => {
      sitemap.push({
        url: `${baseUrl}/p/${post.slug}`,
        lastModified: post.updatedAt || post.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    // Add all topics
    const topicsCollection = await getCollection<Topic>('topics');
    const topics = await topicsCollection.find({}).toArray();

    topics.forEach((topic) => {
      sitemap.push({
        url: `${baseUrl}/t/${topic.slug}`,
        lastModified: topic.updatedAt || topic.createdAt,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return sitemap;
}

