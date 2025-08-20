import asyncio
from typing import Optional
from .session import BrowserSession

class BrowserSessionManager:
    _instance: Optional['BrowserSessionManager'] = None
    _session: Optional[BrowserSession] = None
    _initialized: bool = False
    _init_lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self) -> BrowserSession:
        async with self._init_lock:
            if self._initialized and self._session:
                return self._session

            self._session = BrowserSession()
            await self._session.init()
            self._initialized = True
            return self._session

    async def get_session_async(self) -> BrowserSession:
        if not self._initialized or not self._session:
            return await self.initialize()

        return self._session

    def get_session(self) -> Optional[BrowserSession]:
        return self._session if self._initialized else None

    def is_session_healthy(self) -> bool:
        """Check if the browser session is healthy (connected and page available)"""
        if not self._initialized or not self._session:
            return False
        
        browser = self._session.browser
        page = self._session.page
        
        return (browser and browser.is_connected() and 
                page and not page.is_closed())

    async def cleanup(self):
        async with self._init_lock:
            if self._session:
                await self._session.close()
            self._session = None
            self._initialized = False

    def is_initialized(self) -> bool:
        return self._initialized

# Global instance
session_manager = BrowserSessionManager()

# Convenience functions
async def initialize_browser_session() -> BrowserSession:
    return await session_manager.initialize()

def get_browser_session() -> Optional[BrowserSession]:
    return session_manager.get_session()

async def get_browser_session_async() -> BrowserSession:
    return await session_manager.get_session_async()

async def cleanup_browser_session():
    await session_manager.cleanup()

def is_browser_session_ready() -> bool:
    return session_manager.is_initialized()

def is_browser_session_healthy() -> bool:
    """Check if browser session is healthy (connected and page available)"""
    return session_manager.is_session_healthy()
