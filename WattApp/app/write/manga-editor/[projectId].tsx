import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

const MangaEditorRedirect: React.FC = () => {
  const router = useRouter();
  const { templateId, projectId } = useLocalSearchParams();
  
  // Rediriger automatiquement vers la nouvelle interface
  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId as string);
    if (templateId) params.append('templateId', templateId as string);
    
    const queryString = params.toString();
    const redirectUrl = `/write/manga-editor/simple${queryString ? '?' + queryString : ''}`;
    
    router.replace(redirectUrl as any);
  }, [templateId, projectId, router]);

  return null; // Ne rien afficher pendant la redirection
};

export default MangaEditorRedirect;