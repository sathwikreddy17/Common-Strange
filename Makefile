dev:
	docker compose up --build

down:
	docker compose down

# Local (non-Docker) backend tests using SQLite
# Requires a local venv with backend requirements installed.
test-backend-local:
	cd backend && DJANGO_SETTINGS_MODULE=config.settings_test python manage.py test

# Docker-based backend tests (current CI-like path)
test-backend-docker:
	docker compose run --rm backend python manage.py test

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell

seed:
	docker compose exec backend python manage.py seed_demo
