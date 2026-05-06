# Patch Note

Fixed Vercel error:

`EXTRA_HOST_LINES is not a valid Page export field`

Cause:
Next.js App Router page files cannot export arbitrary constants from `page.tsx`.

Fix:
Changed:

```ts
export const EXTRA_HOST_LINES = [...]
```

to:

```ts
const EXTRA_HOST_LINES = [...]
```

Now redeploy.
