CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION catalog_fold_search_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      coalesce(input, ''),
      'ƏəIıİÖöÜüĞğŞşÇç',
      'eeiiioouuggsscc'
    )),
    '\s+', ' ', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION catalog_compact_search_token(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    catalog_fold_search_text(coalesce(input, '')),
    '[^a-z0-9]',
    '',
    'g'
  );
$$;

CREATE OR REPLACE FUNCTION catalog_json_plain_text(input jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN ''
    ELSE regexp_replace(input::text, '[^[:alnum:]._-]+', ' ', 'g')
  END;
$$;

CREATE OR REPLACE FUNCTION catalog_json_compact_tokens(input jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(string_agg(catalog_compact_search_token(token), ' '), '')
  FROM (
    SELECT btrim(elem->>'value') AS token
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(input) = 'array' THEN input ELSE '[]'::jsonb END
    ) AS elem
    WHERE jsonb_typeof(elem) = 'object'
    UNION ALL
    SELECT btrim(kv.value)
    FROM jsonb_each_text(
      CASE WHEN jsonb_typeof(input) = 'object' THEN input ELSE '{}'::jsonb END
    ) AS kv
  ) AS tokens
  WHERE token IS NOT NULL AND token <> '';
$$;

CREATE OR REPLACE FUNCTION catalog_build_variant_search_document(
  sku text,
  barcode text,
  variant_name text,
  attributes jsonb,
  product_name text,
  slug text,
  description text,
  seo_title text,
  seo_description text,
  required_specs jsonb,
  brand_name text,
  category_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT catalog_fold_search_text(concat_ws(
    ' ',
    sku,
    barcode,
    variant_name,
    product_name,
    slug,
    description,
    seo_title,
    seo_description,
    brand_name,
    category_name,
    catalog_json_plain_text(required_specs),
    catalog_json_plain_text(attributes),
    catalog_compact_search_token(sku),
    catalog_compact_search_token(barcode),
    catalog_compact_search_token(product_name),
    catalog_compact_search_token(variant_name),
    catalog_json_compact_tokens(required_specs),
    catalog_json_compact_tokens(attributes)
  ));
$$;

ALTER TABLE "product_variants"
  ADD COLUMN "search_document" TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION catalog_product_variant_search_document_biu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  product_name text;
  product_slug text;
  product_description text;
  product_seo_title text;
  product_seo_description text;
  product_required_specs jsonb;
  brand_name text;
  category_name text;
BEGIN
  SELECT
    p.name,
    p.slug,
    p.description,
    p.seo_title,
    p.seo_description,
    p.required_specs,
    b.name,
    c.name
  INTO
    product_name,
    product_slug,
    product_description,
    product_seo_title,
    product_seo_description,
    product_required_specs,
    brand_name,
    category_name
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;

  NEW.search_document := catalog_build_variant_search_document(
    NEW.sku,
    NEW.barcode,
    NEW.name,
    NEW.attributes,
    product_name,
    product_slug,
    product_description,
    product_seo_title,
    product_seo_description,
    product_required_specs,
    brand_name,
    category_name
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER product_variants_search_document_biu
  BEFORE INSERT OR UPDATE
  ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION catalog_product_variant_search_document_biu();

CREATE OR REPLACE FUNCTION catalog_refresh_product_variants_search_document()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.name IS NOT DISTINCT FROM OLD.name
    AND NEW.slug IS NOT DISTINCT FROM OLD.slug
    AND NEW.description IS NOT DISTINCT FROM OLD.description
    AND NEW.seo_title IS NOT DISTINCT FROM OLD.seo_title
    AND NEW.seo_description IS NOT DISTINCT FROM OLD.seo_description
    AND NEW.required_specs IS NOT DISTINCT FROM OLD.required_specs
    AND NEW.brand_id IS NOT DISTINCT FROM OLD.brand_id
    AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id
  THEN
    RETURN NEW;
  END IF;

  UPDATE product_variants
  SET search_document = search_document
  WHERE product_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_refresh_variant_search_document
  AFTER INSERT OR UPDATE OF name, slug, description, seo_title, seo_description, required_specs, brand_id, category_id
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION catalog_refresh_product_variants_search_document();

CREATE OR REPLACE FUNCTION catalog_refresh_brand_variants_search_document()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  UPDATE product_variants AS pv
  SET search_document = search_document
  FROM products AS p
  WHERE p.id = pv.product_id
    AND p.brand_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER brands_refresh_variant_search_document
  AFTER UPDATE OF name
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION catalog_refresh_brand_variants_search_document();

CREATE OR REPLACE FUNCTION catalog_refresh_category_variants_search_document()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  UPDATE product_variants AS pv
  SET search_document = search_document
  FROM products AS p
  WHERE p.id = pv.product_id
    AND p.category_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_refresh_variant_search_document
  AFTER UPDATE OF name
  ON categories
  FOR EACH ROW
  EXECUTE FUNCTION catalog_refresh_category_variants_search_document();

UPDATE product_variants SET search_document = search_document;

CREATE INDEX "product_variants_search_document_trgm_idx"
  ON "product_variants"
  USING gin ("search_document" gin_trgm_ops);
