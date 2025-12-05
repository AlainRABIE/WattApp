declare module 'react-native-pell-rich-editor' {
  import { Component } from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface RichEditorProps {
    ref?: any;
    disabled?: boolean;
    initialContentHTML?: string;
    placeholder?: string;
    onChange?: (html: string) => void;
    editorInitializedCallback?: () => void;
    editorStyle?: {
      backgroundColor?: string;
      color?: string;
      placeholderColor?: string;
      contentCSSText?: string;
      [key: string]: any;
    };
    style?: StyleProp<ViewStyle>;
    useContainer?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
  }

  export class RichEditor extends Component<RichEditorProps> {
    setContentHTML(html: string): void;
    getContentHtml(): Promise<string>;
    insertText(text: string): void;
    setForeColor(color: string): void;
    insertImage(url: string): void;
    focusContentEditor(): void;
    blurContentEditor(): void;
  }

  export interface RichToolbarProps {
    editor?: any;
    actions?: string[];
    iconTint?: string;
    selectedIconTint?: string;
    unselectedButtonStyle?: StyleProp<ViewStyle>;
    selectedButtonStyle?: StyleProp<ViewStyle>;
    iconSize?: number;
    style?: StyleProp<ViewStyle>;
  }

  export class RichToolbar extends Component<RichToolbarProps> {}

  export const actions: {
    setBold: string;
    setItalic: string;
    setUnderline: string;
    setStrikethrough: string;
    insertBulletsList: string;
    insertOrderedList: string;
    setUndo: string;
    setRedo: string;
    heading1: string;
    heading2: string;
    heading3: string;
    heading4: string;
    heading5: string;
    heading6: string;
    setParagraph: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignFull: string;
    setSubscript: string;
    setSuperscript: string;
    setForeColor: string;
    setHiliteColor: string;
    insertImage: string;
    insertLink: string;
    removeFormat: string;
    insertVideo: string;
    checkboxList: string;
    code: string;
    line: string;
    blockquote: string;
  };
}
