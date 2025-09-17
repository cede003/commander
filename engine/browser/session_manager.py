import asyncio
from typing import Optional
from engine.browser.session import BrowserSession
from engine.utils.logging.logger import logger

class BrowserSessionManager:
    _instance: Optional['BrowserSessionManager'] = None
    _session: Optional[BrowserSession] = None
    _initialized: bool = False
    _init_lock = asyncio.Lock()
    _heartbeat_task: Optional[asyncio.Task] = None
    _heartbeat_interval_seconds: int = 30

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
            if self._heartbeat_task is None or self._heartbeat_task.done():
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            return self._session
    
    async def restart_session(self) -> BrowserSession:
        """Gracefully restart the browser session"""
        logger.info("Restarting browser session...")
        
        # Stop current heartbeat
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Clean up existing session
        if self._session:
            try:
                await self._session.close()
            except Exception as e:
                logger.warning(f"Error closing old session during restart: {e}")
        
        # Reset state
        self._session = None
        self._initialized = False
        
        # Reinitialize
        new_session = await self.initialize()
        logger.info("Browser session restarted successfully")
        return new_session
    
    async def _heartbeat_loop(self):
        while self._initialized and self._session:
            try:
                if self._session.page and not self._session.page.is_closed():
                    await self._session.page.evaluate("() => {}")
                    logger.info("Heartbeat successful")
                
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                # Optionally, you could consider resetting the session here

            await asyncio.sleep(self._heartbeat_interval_seconds)

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

async def restart_browser_session() -> BrowserSession:
    """Restart the browser session"""
    return await session_manager.restart_session()

def is_browser_session_ready() -> bool:
    return session_manager.is_initialized()

def is_browser_session_healthy() -> bool:
    """Check if browser session is healthy (connected and page available)"""
    return session_manager.is_session_healthy()
