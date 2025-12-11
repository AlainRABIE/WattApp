import React, { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

export interface RichTextEditorRef {
  setContentHTML: (html: string) => void;
  getContentHtml: () => Promise<string>;
  insertText: (text: string) => void;
  setForeColor: (color: string) => void;
  applyColorToSelection: (color: string) => void;
  insertImage: (url: string) => void;
  setBold: () => void;
  setItalic: () => void;
  setUnderline: () => void;
  setStrikethrough: () => void;
  setHeading: (level: number) => void;
  setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => void;
  updateFontSize: (size: number) => void;
  setFontSizeForSelection: (size: number) => void;
  focusContentEditor: () => void;
  blurContentEditor: () => void;
}

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onChangeHtml?: (html: string) => void;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  editorStyle?: any;
  showToolbar?: boolean;
  disabled?: boolean;
}

const RichTextEditorComponent = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      initialContent = '',
      placeholder = 'Commencez à écrire...',
      onChangeText,
      onChangeHtml,
      backgroundColor = '#181818',
      textColor = '#ffffff',
      placeholderColor = '#888888',
      fontSize = 16,
      fontFamily = 'Georgia',
      lineHeight = 1.6,
      editorStyle,
      showToolbar = false,
      disabled = false,
    },
    ref
  ) => {
    const richText = useRef<RichEditor>(null);

    // Exposer les méthodes via ref
    useImperativeHandle(ref, () => ({
      setContentHTML: (html: string) => {
        richText.current?.setContentHTML(html);
      },
      getContentHtml: async () => {
        return await richText.current?.getContentHtml() || '';
      },
      insertText: (text: string) => {
        richText.current?.insertText(text);
      },
      setForeColor: (color: string) => {
        richText.current?.setForeColor(color);
      },
      applyColorToSelection: (color: string) => {
        // Utiliser la méthode setForeColor qui applique la couleur à la sélection
        // ou définit la couleur pour le prochain texte saisi
        richText.current?.setForeColor(color);
      },
      insertImage: (url: string) => {
        richText.current?.insertImage(url);
      },
      setBold: () => {
        (richText.current as any)?.setBold();
      },
      setItalic: () => {
        (richText.current as any)?.setItalic();
      },
      setUnderline: () => {
        (richText.current as any)?.setUnderline();
      },
      setStrikethrough: () => {
        (richText.current as any)?.setStrikethrough();
      },
      setHeading: (level: number) => {
        (richText.current as any)?.setHeading(level);
      },
      setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => {
        // Utiliser sendAction pour exécuter les commandes d'alignement
        const editor = richText.current as any;
        if (!editor) return;
        
        try {
          if (align === 'left') {
            editor.sendAction?.('justifyLeft', 'result');
          } else if (align === 'center') {
            editor.sendAction?.('justifyCenter', 'result');
          } else if (align === 'right') {
            editor.sendAction?.('justifyRight', 'result');
          } else if (align === 'justify') {
            editor.sendAction?.('justifyFull', 'result');
          }
        } catch (error) {
          console.log('Alignement non supporté:', error);
        }
      },
      updateFontSize: (size: number) => {
        // Mettre à jour la taille de police globale via CSS
        const editor = richText.current as any;
        // Note: Ceci change le style CSS global, pas le contenu HTML
      },
      setFontSizeForSelection: async (size: number) => {
        // Obtenir le HTML actuel, modifier et remettre
        const editor = richText.current;
        if (!editor) return;
        
        try {
          // Utiliser insertHTML pour ajouter un span avec la taille
          const htmlToInsert = `<span style="font-size: ${size}px;">TEXTE_TEMPORAIRE</span>`;
          (editor as any).insertHTML?.(htmlToInsert);
        } catch (e) {
          console.log('Erreur insertion HTML:', e);
        }
      },
      focusContentEditor: () => {
        richText.current?.focusContentEditor();
      },
      blurContentEditor: () => {
        richText.current?.blurContentEditor();
      },
    }));

    const handleChange = (html: string) => {
      if (onChangeHtml) {
        onChangeHtml(html);
      }
      
      // Extraire le texte brut du HTML pour onChangeText
      if (onChangeText) {
        const textOnly = html
          .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
          .replace(/&nbsp;/g, ' ') // Remplacer les espaces insécables
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        onChangeText(textOnly);
      }
    };

    const editorInitializedCallback = () => {
      if (initialContent) {
        richText.current?.setContentHTML(initialContent);
      }
    };

    // Mettre à jour la taille de police quand elle change
    useEffect(() => {
      const editor = richText.current as any;
      if (editor?.webview?.current) {
        editor.webview.current.injectJavaScript(`
          var content = document.getElementById('content');
          if (content) {
            content.style.fontSize = '${fontSize}px';
          }
          var pellContent = document.querySelector('.pell-content');
          if (pellContent) {
            pellContent.style.fontSize = '${fontSize}px';
          }
          true;
        `);
      }
    }, [fontSize]);

    // Mettre à jour la police quand elle change
    useEffect(() => {
      const editor = richText.current as any;
      if (editor?.webview?.current) {
        editor.webview.current.injectJavaScript(`
          var content = document.getElementById('content');
          if (content) {
            content.style.fontFamily = '${fontFamily}, serif';
          }
          var pellContent = document.querySelector('.pell-content');
          if (pellContent) {
            pellContent.style.fontFamily = '${fontFamily}, serif';
          }
          true;
        `);
      }
    }, [fontFamily]);

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          keyboardDismissMode="none"
          nestedScrollEnabled={true}
        >
          <RichEditor
            ref={richText}
            disabled={disabled}
            initialContentHTML={initialContent}
            placeholder={placeholder}
            onChange={handleChange}
            editorInitializedCallback={editorInitializedCallback}
            editorStyle={{
              backgroundColor,
              color: textColor,
              placeholderColor,
              contentCSSText: `
                font-size: ${fontSize}px;
                font-family: ${fontFamily}, serif;
                line-height: ${lineHeight};
                color: ${textColor};
                padding: 20px;
                min-height: 500px;
              `,
              ...editorStyle,
            }}
            style={styles.richEditor}
            useContainer={true}
            containerStyle={styles.editorContainer}
          />
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  richEditor: {
    flex: 1,
    minHeight: 500,
  },
  editorContainer: {
    flex: 1,
  },
});

RichTextEditorComponent.displayName = 'RichTextEditor';

export default RichTextEditorComponent;
