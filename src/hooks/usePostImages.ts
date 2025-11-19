import { useState, useEffect } from 'react';
import { firebaseDB } from '@/services/firebaseService';
import { PostImage } from '@/types';

export const usePostImages = (postId: string) => {
  const [images, setImages] = useState<PostImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setImages([]);
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const imageData = await firebaseDB.postImages.getByPostId(postId);
        setImages(imageData);
      } catch (err) {
        console.error('Error fetching post images:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [postId]);

  return { images, loading, error };
};

export const usePostImage = (postId: string, imageId: string) => {
  const [image, setImage] = useState<PostImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !imageId) {
      setImage(null);
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        const imageData = await firebaseDB.postImages.getById(postId, imageId);
        setImage(imageData);
      } catch (err) {
        console.error('Error fetching post image:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [postId, imageId]);

  return { image, loading, error };
};
