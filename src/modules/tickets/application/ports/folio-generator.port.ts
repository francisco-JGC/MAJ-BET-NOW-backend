export const FOLIO_GENERATOR = Symbol('FOLIO_GENERATOR');

export interface FolioGenerator {
  generate(): string;
}
