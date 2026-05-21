/**
 * POST /api/scan/page-candidates
 *
 * Input:
 *   pageText: string
 *   pageTitle: string
 *   sourceUrl: string
 *   candidates?: QuestionCandidate[]  // client-detected candidates
 *
 * Output:
 *   candidates: QuestionCandidate[]  // enriched/verified candidates
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
declare const PageCandidatesRequestSchema: z.ZodObject<{
    pageText: z.ZodString;
    pageTitle: z.ZodDefault<z.ZodString>;
    sourceUrl: z.ZodDefault<z.ZodString>;
    candidates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        options: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        confidence: z.ZodDefault<z.ZodNumber>;
        boundingHint: z.ZodOptional<z.ZodObject<{
            top: z.ZodNumber;
            left: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            left: number;
            width: number;
            height: number;
        }, {
            top: number;
            left: number;
            width: number;
            height: number;
        }>>;
        source: z.ZodDefault<z.ZodEnum<["dom", "inferred"]>>;
    }, "strip", z.ZodTypeAny, {
        options: string[];
        confidence: number;
        id: string;
        text: string;
        source: "dom" | "inferred";
        boundingHint?: {
            top: number;
            left: number;
            width: number;
            height: number;
        } | undefined;
    }, {
        id: string;
        text: string;
        options?: string[] | undefined;
        confidence?: number | undefined;
        boundingHint?: {
            top: number;
            left: number;
            width: number;
            height: number;
        } | undefined;
        source?: "dom" | "inferred" | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sourceUrl: string;
    pageTitle: string;
    pageText: string;
    candidates?: {
        options: string[];
        confidence: number;
        id: string;
        text: string;
        source: "dom" | "inferred";
        boundingHint?: {
            top: number;
            left: number;
            width: number;
            height: number;
        } | undefined;
    }[] | undefined;
}, {
    pageText: string;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    candidates?: {
        id: string;
        text: string;
        options?: string[] | undefined;
        confidence?: number | undefined;
        boundingHint?: {
            top: number;
            left: number;
            width: number;
            height: number;
        } | undefined;
        source?: "dom" | "inferred" | undefined;
    }[] | undefined;
}>;
export type PageCandidatesRequest = z.infer<typeof PageCandidatesRequestSchema>;
export interface QuestionCandidate {
    id: string;
    text: string;
    options: string[];
    confidence: number;
    boundingHint?: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    source: 'dom' | 'inferred';
}
export declare function registerScanRoutes(app: FastifyInstance): void;
export {};
//# sourceMappingURL=scan.routes.d.ts.map