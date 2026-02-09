dev:
	docker compose up --build

down:
	docker compose down

# Backend tests (run inside Docker — requires `docker compose up` first)
test:
	docker compose exec backend python manage.py test --settings=config.settings_test --verbosity=2

# Shorter alias
test-backend:
	docker compose exec backend python manage.py test --settings=config.settings_test --verbosity=2

# Run a specific test class or method
# Usage: make test-one TEST=content.tests.PaginationFormatTests
test-one:
	docker compose exec backend python manage.py test --settings=config.settings_test --verbosity=2 $(TEST)

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
