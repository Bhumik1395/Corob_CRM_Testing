from app.domains.pm import (
    upload as upload_router,
    dashboard as dashboard_router,
    review as review_router,
    print_report as print_router,
    ticket_report as ticket_router,
)

__all__ = ["upload_router", "dashboard_router", "review_router", "print_router", "ticket_router"]