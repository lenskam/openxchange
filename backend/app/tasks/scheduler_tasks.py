import logging
from datetime import datetime

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.workflow import Workflow

logger = logging.getLogger(__name__)


@celery_app.task
def check_workflow_schedules():
    logger.info(f"Checking workflow schedules at {datetime.utcnow()}")
    try:
        import asyncio

        async def _check():
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Workflow).where(Workflow.status == "active")
                )
                workflows = list(result.scalars().all())

            from croniter import croniter

            now = datetime.utcnow()
            for wf in workflows:
                if not wf.schedule:
                    continue
                try:
                    cron = croniter(wf.schedule, now)
                    prev_time = cron.get_prev(datetime)
                    if (now - prev_time).total_seconds() < 120:
                        from app.tasks.workflow_tasks import execute_workflow
                        execute_workflow.delay(wf.id)
                        logger.info(f"Queued workflow {wf.id} ({wf.name})")
                except Exception as e:
                    logger.error(f"Error checking schedule for workflow {wf.id}: {e}")

        asyncio.run(_check())
    except Exception as e:
        logger.error(f"Schedule check failed: {e}")
