export declare const repoRoot: string;
/** The content repo folder. Throws with setup instructions if it is missing. */
export declare function contentRoot(): string;
/** `<content>/shows/<id>` */
export declare function showDir(id: string): string;
