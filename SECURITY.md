# Security

Your chats are private, so this project is built to never send them anywhere: the web page has a Content-Security-Policy with `connect-src 'none'`, there is no analytics and no server. Message text is always HTML-escaped before it is shown.

If you find a way for chat content to leave the page, or a crafted file that executes script or hangs the page, please report it with GitHub's **private vulnerability reporting** (Security tab > Report a vulnerability) rather than a public issue.
