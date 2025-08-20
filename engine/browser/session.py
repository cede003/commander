import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Browser, Page

CDP_URL = "http://localhost:9222"

class BrowserSession:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None

    async def init(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.connect_over_cdp(CDP_URL)

        context = self.browser.contexts[0]
        for page in context.pages:
            try:
                if await page.evaluate("window._isMainAppPage === true"):
                    self.page = page
                    return
            except:
                continue

        for page in context.pages:
            if self._is_valid_app_url(page.url):
                self.page = page
                await self._tag_page()
                return

        self.page = await context.new_page()
        await self._tag_page()

    async def _tag_page(self):
        if self.page:
            await self.page.evaluate("""
                window._isMainAppPage = true;
                window._appTaggedAt = new Date().toISOString();
            """)

    def _is_valid_app_url(self, url: str) -> bool:
        return url and not any(
            url.startswith(prefix) for prefix in (
                "chrome://", "devtools://", "chrome-devtools://"
            )
        ) and url != "about:blank"

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    def get_page(self) -> Optional[Page]:
        return self.page

    def get_browser(self) -> Optional[Browser]:
        return self.browser
