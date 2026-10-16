-- Person slugs dropped every non-ASCII letter instead of transliterating it:
-- "Łukasz Michta" became "ukaszmichta" and "Żółć" collapsed to "user".
-- Transliterate Polish (and common Latin) diacritics first. Only affects slugs
-- generated or normalized from now on: assign_profile_person_slug keeps
-- old.person_slug on updates, so existing public links do not change.
-- translate() is used with both cases spelled out because lower() does not
-- fold non-ASCII letters under a C collation.

create or replace function public.normalize_person_slug(input_value text)
returns text
language sql
immutable
as $$
  select left(
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          lower(translate(
            coalesce(input_value, ''),
            'ąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüéèêëáàâíìîïòôúùûçñÄÖÜÉÈÊËÁÀÂÍÌÎÏÒÔÚÙÛÇÑ',
            'acelnoszzACELNOSZZaoueeeeaaaiiiioouuucnAOUEEEEAAAIIIIOOUUUCN'
          )),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'user'
    ),
    80
  );
$$;

create or replace function public.profile_compact_person_slug(
  input_first_name text,
  input_last_name text,
  input_fallback text default 'user'
)
returns text
language sql
immutable
as $$
  with compact_slug as (
    select coalesce(
      nullif(
        regexp_replace(
          lower(translate(
            coalesce(nullif(concat(coalesce(input_first_name, ''), coalesce(input_last_name, '')), ''), input_fallback, ''),
            'ąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüéèêëáàâíìîïòôúùûçñÄÖÜÉÈÊËÁÀÂÍÌÎÏÒÔÚÙÛÇÑ',
            'acelnoszzACELNOSZZaoueeeeaaaiiiioouuucnAOUEEEEAAAIIIIOOUUUCN'
          )),
          '[^a-z0-9]+',
          '',
          'g'
        ),
        ''
      ),
      'user'
    ) as value
  )
  select left(
    case
      when char_length(value) >= 3 then value
      else concat(value, 'user')
    end,
    80
  )
  from compact_slug;
$$;
