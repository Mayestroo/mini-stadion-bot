import httpx
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class TelegramSendResult:
    ok: bool
    error: str | None = None

    def __bool__(self) -> bool:
        return self.ok


def admin_telegram_ids() -> list[str]:
    return [item.strip() for item in settings.ADMIN_TELEGRAM_IDS.split(",") if item.strip()]


def _telegram_error(response: httpx.Response) -> str:
    return f"HTTP {response.status_code}: {response.text[:500]}"


def send_telegram_message(chat_id: str | int | None, text: str) -> TelegramSendResult:
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return TelegramSendResult(False, "Telegram bot token yoki chat_id yo'q")
    try:
        response = httpx.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": str(chat_id), "text": text},
            timeout=5,
        )
        if response.status_code >= 400:
            return TelegramSendResult(False, _telegram_error(response))
        return TelegramSendResult(True)
    except Exception as exc:
        return TelegramSendResult(False, str(exc)[:500])


def send_telegram_broadcast(
    chat_id: str | int | None,
    title: str,
    message: str,
    image_url: str | None = None,
    cta_text: str | None = None,
    cta_url: str | None = None,
    parse_mode: str | None = None,
) -> TelegramSendResult:
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return TelegramSendResult(False, "Telegram bot token yoki chat_id yo'q")
    text = f"{title}\n\n{message}"
    payload = {"chat_id": str(chat_id), "parse_mode": parse_mode}
    if cta_text and cta_url:
        payload["reply_markup"] = {"inline_keyboard": [[{"text": cta_text, "url": cta_url}]]}
    payload = {key: value for key, value in payload.items() if value is not None}
    try:
        if image_url:
            response = httpx.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto",
                json={**payload, "photo": image_url, "caption": text[:1024]},
                timeout=8,
            )
        else:
            response = httpx.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={**payload, "text": text},
                timeout=8,
            )
        if response.status_code >= 400:
            return TelegramSendResult(False, _telegram_error(response))
        return TelegramSendResult(True)
    except Exception as exc:
        return TelegramSendResult(False, str(exc)[:500])


def send_booking_action_message(chat_id: str | int | None, title: str, message: str, booking_id: int) -> TelegramSendResult:
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return TelegramSendResult(False, "Telegram bot token yoki chat_id yo'q")
    try:
        response = httpx.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": str(chat_id),
                "text": f"{title}\n\n{message}",
                "reply_markup": {"inline_keyboard": [[{"text": "✅ Tasdiqlash", "callback_data": f"confirm_booking:{booking_id}"}]]},
            },
            timeout=8,
        )
        if response.status_code >= 400:
            return TelegramSendResult(False, _telegram_error(response))
        return TelegramSendResult(True)
    except Exception as exc:
        return TelegramSendResult(False, str(exc)[:500])


def send_admin_message(text: str) -> None:
    for chat_id in admin_telegram_ids():
        send_telegram_message(chat_id, text)
