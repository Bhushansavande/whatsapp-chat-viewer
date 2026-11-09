# WhatsApp Chat Viewer

Open a WhatsApp **Export chat** file in your browser, search it, see who talks most and when, and browse the photos. **Nothing is uploaded**: the page has no server and its security policy forbids network requests.

**Use it:** https://bhushansavande.github.io/whatsapp-chat-viewer/ (works on a phone)

## Features

- Reads the `.txt` export, or the `.zip` made by *Include media* (photos, videos and voice notes are shown inline)
- Android and iPhone formats, 12 and 24 hour clocks, `dd/mm/yy`, `mm/dd/yy`, `yyyy-mm-dd`, dot and dash separators, multi-line messages, deleted messages, system messages
- Search with highlighting, filter by person and date range, tap a name to see the chat from their side
- Statistics: messages per person, average length, who starts conversations, activity by month, hour and weekday, most used words and emoji
- Handles chats with tens of thousands of messages
- Dark mode, no dependencies, MIT licensed

## How to export a chat

WhatsApp > open the chat > tap the name > **Export chat** > *Without media* or *Include media* > save to your phone > pick the file in the viewer.

## Honest limits

- Dates like `01/02/23` are ambiguous. The viewer guesses day-first, tells you when it is not sure, and lets you switch.
- Only text exports are parsed. Voice messages and videos are playable only when the `.zip` contains them (WhatsApp limits how many files it includes).
- Very large `.zip` files are read into memory, so a huge media export may be slow on an old phone.
- Not affiliated with WhatsApp.

## Run it yourself

It is plain HTML and JavaScript in `docs/`. Open `docs/index.html` through any static server (`python3 -m http.server -d docs`) or fork the repository and enable GitHub Pages.

## Tests

```
npm test
```

## License

MIT
