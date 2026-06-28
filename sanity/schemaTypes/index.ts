import { type SchemaTypeDefinition } from "sanity";
import latex from "../schemas/latex";
import imageExternal from "../schemas/imageExternal";
import { faqBlock, erroriComuniBlock, esempioBlock, riepilogoBlock, schemaRapidoBlock } from "../schemas/lesson";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [latex, imageExternal, faqBlock, erroriComuniBlock, esempioBlock, riepilogoBlock, schemaRapidoBlock],
};
