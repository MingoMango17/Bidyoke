import logging

from app.logs import RedactTokens


def make_record(msg, *args):
    return logging.LogRecord("uvicorn.error", logging.INFO, __file__, 1, msg, args, None)


def test_redacts_token_in_message():
    record = make_record('WebSocket /ws/sessions/ABCDE?token=secret123_-x" [accepted]')
    RedactTokens().filter(record)
    assert "secret123" not in record.getMessage()
    assert "token=***" in record.getMessage()


def test_redacts_token_in_args():
    record = make_record('%s - "WebSocket %s" 401', "127.0.0.1", "/ws/s/ABCDE?token=abc.def&x=1")
    RedactTokens().filter(record)
    msg = record.getMessage()
    assert "abc.def" not in msg
    assert "token=***&x=1" in msg


def test_leaves_other_messages_untouched():
    record = make_record("GET /healthz 200")
    RedactTokens().filter(record)
    assert record.getMessage() == "GET /healthz 200"


def test_keeps_args_shape_for_uvicorn_formatter():
    record = make_record('%s - "%s %s HTTP/%s" %d', "127.0.0.1", "GET", "/x?token=abc", "1.1", 200)
    RedactTokens().filter(record)
    assert isinstance(record.args, tuple) and len(record.args) == 5
    assert record.args[4] == 200
    assert record.getMessage() == '127.0.0.1 - "GET /x?token=*** HTTP/1.1" 200'
