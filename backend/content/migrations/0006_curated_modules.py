from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0005_search_tsvector_and_gin"),
    ]

    operations = [
        migrations.CreateModel(
            name="CuratedModule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "placement",
                    models.CharField(
                        choices=[
                            ("HOME", "Home"),
                            ("CATEGORY", "Category"),
                            ("SERIES", "Series"),
                            ("AUTHOR", "Author"),
                        ],
                        default="HOME",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(blank=True, default="", max_length=200)),
                ("subtitle", models.CharField(blank=True, default="", max_length=500)),
                ("order", models.IntegerField(default=0)),
                ("publish_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.author"),
                ),
                (
                    "category",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.category"),
                ),
                (
                    "series",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.series"),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["placement", "order"], name="content_cur_place_8b613e_idx"),
                    models.Index(fields=["placement", "is_active"], name="content_cur_place_4f86a6_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="CuratedModuleItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order", models.IntegerField(default=0)),
                (
                    "item_type",
                    models.CharField(
                        choices=[
                            ("ARTICLE", "Article"),
                            ("CATEGORY", "Category"),
                            ("SERIES", "Series"),
                            ("AUTHOR", "Author"),
                        ],
                        default="ARTICLE",
                        max_length=20,
                    ),
                ),
                ("override_title", models.CharField(blank=True, default="", max_length=250)),
                ("override_dek", models.CharField(blank=True, default="", max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "article",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.article"),
                ),
                (
                    "author",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.author"),
                ),
                (
                    "category",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.category"),
                ),
                (
                    "module",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="content.curatedmodule"),
                ),
                (
                    "series",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="content.series"),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["module", "order"], name="content_cur_module_9bbf7e_idx"),
                ]
            },
        ),
    ]
