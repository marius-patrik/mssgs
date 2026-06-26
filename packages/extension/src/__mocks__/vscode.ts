import { vi } from 'vitest';

export enum ColorThemeKind {
  Light = 1,
  Dark = 2,
  HighContrast = 3,
  HighContrastLight = 4,
}

export class Uri {
  constructor(
    public readonly scheme: string,
    public readonly authority: string,
    public readonly path: string,
    public readonly query: string,
    public readonly fragment: string,
  ) {}

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const joined = [base.path, ...pathSegments].join('/').replace(/\/+/g, '/');
    return new Uri(base.scheme, base.authority, joined, base.query, base.fragment);
  }

  get fsPath(): string {
    return this.path;
  }

  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment,
    );
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }

  toJSON(): { scheme: string; authority: string; path: string; query: string; fragment: string } {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  }
}

export const commands = {
  registerCommand: vi.fn((command: string, callback: () => void) => ({
    command,
    callback,
    dispose: vi.fn(),
  })),
};

export const window = {
  activeColorTheme: { kind: ColorThemeKind.Dark },
  createWebviewPanel: vi.fn(
    (
      viewType: string,
      title: string,
      _viewColumn: unknown,
      options: { enableScripts?: boolean; localResourceRoots?: Uri[] },
    ) => ({
      viewType,
      title,
      options,
      webview: {
        html: '',
        cspSource: 'vscode-webview-test',
        options: {},
        asWebviewUri: vi.fn((uri: Uri) => `webview-uri:${uri.path}`),
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn(),
      },
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
      dispose: vi.fn(),
    }),
  ),
  registerWebviewViewProvider: vi.fn((_viewId: string, provider: unknown) => ({
    provider,
    dispose: vi.fn(),
  })),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
};

export enum ViewColumn {
  One = 1,
}
