Use the Gitlab GraphQL api to export timespent on a project in Gitlab.

Usage:

Make sure to set your gitlab api token in your environment as `GITLAB_TOKEN`.

`bun ./gitlab-timereport.js --name={name} --pid={gitlab project id}`

**name**: the name of your project, this will be used in the filename
**pid**: your gitlab project id

A BOM is added so it should open nicely in Excel.

> \ufeff is the Unicode Byte Order Mark (BOM), specifically the UTF-8 BOM. It's a special invisible character that is sometimes added at the beginning of text files to indicate that they are encoded in UTF-8. When used in CSV files, it helps Excel and some other applications properly recognize UTF-8 encoding, particularly for files that contain non-ASCII characters like accents or other special characters. Without it, Excel might misinterpret UTF-8 encoded characters.