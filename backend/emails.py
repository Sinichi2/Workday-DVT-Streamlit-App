from __future__ import annotations

from typing import Annotated

import email_validator
from pydantic import AfterValidator


def _check(v: str) -> str:
    """Validate shape and deliverability-of-domain WITHOUT rejecting reserved
    TLDs. Pydantic's EmailStr refuses .test/.local/.internal outright, which
    also blocks legitimate internal corporate domains — and Supabase validates
    on its own side regardless."""
    try:
        return email_validator.validate_email(v, check_deliverability=False, test_environment=True).normalized
    except email_validator.EmailNotValidError as e:
        raise ValueError(str(e)) from e


Email = Annotated[str, AfterValidator(_check)]
